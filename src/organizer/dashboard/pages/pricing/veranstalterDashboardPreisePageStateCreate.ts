import { createMemo, createRenderEffect, untrack } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { adminEventReleaseDateTimeToIso } from "#src/admin/adminEventReleaseDateTimeToIso.ts"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { veranstalterDashboardPageStateCreate } from "../../client/veranstalterDashboardPageStateCreate.ts"
import { veranstalterDashboardPreiseMutationsCreate } from "./veranstalterDashboardPreiseMutationsCreate.ts"
import type { VeranstalterDashboardPreiseSearch } from "./veranstalterDashboardPreiseSearchParse.ts"

function veranstalterDashboardPreiseEuroToCents(raw: string): number | undefined {
  const cents = Math.round(Number(raw.replace(/\s/g, "").replace(",", ".")) * 100)
  return Number.isInteger(cents) && cents >= 0 ? cents : undefined
}

function veranstalterDashboardPreiseIntOrUndefined(raw: string, min: number): number | undefined {
  if (raw.trim() === "") return undefined
  const value = Number(raw)
  return Number.isInteger(value) && value >= min ? value : undefined
}

function veranstalterDashboardPreiseTierKeys(raw: string): string[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

export function veranstalterDashboardPreisePageStateCreate(inputs: {
  search: () => VeranstalterDashboardPreiseSearch
  changeSearch: (search: VeranstalterDashboardPreiseSearch) => void
  eventKey: () => string
}) {
  const requestedOrg = createMemo(() => inputs.search().org)
  const page = veranstalterDashboardPageStateCreate({
    orgId: requestedOrg,
    selectOrganization: (org) => inputs.changeSearch({ org }),
  })
  const permissions = () => page.shell.activeOrganization()?.permissions ?? []
  const canTickets = () => permissions().includes("tickets.bearbeiten")
  const canCodes = () => permissions().includes("codes.bearbeiten")
  const mutations = veranstalterDashboardPreiseMutationsCreate()

  const phases = queryCreate(api.organizerDashboardPricing.organizerDashboardPhaseListQuery, () => {
    const orgId = page.orgId()
    if (!orgId || !canTickets()) return undefined
    return {
      orgId: orgId as Id<"orgs">,
      eventKey: inputs.eventKey(),
      ...(inputs.search().tier ? { tierKey: inputs.search().tier as string } : {}),
    }
  })
  const codes = queryCreate(api.organizerDashboardPricing.organizerDashboardCodeListQuery, () => {
    const orgId = page.orgId()
    if (!orgId || !canCodes()) return undefined
    return {
      orgId: orgId as Id<"orgs">,
      eventKey: inputs.eventKey(),
      ...(inputs.search().art ? { kind: inputs.search().art as "rabatt" | "zugang" } : {}),
      paginationOpts: { numItems: 25, cursor: inputs.search().cursor ?? null },
    }
  })

  const busy = createSignalObject(false)
  const message = createSignalObject("")
  const phaseTier = createSignalObject(inputs.search().tier ?? "")
  const phaseName = createSignalObject("")
  const phasePrice = createSignalObject("")
  const phaseEndsAt = createSignalObject("")
  const phaseQuota = createSignalObject("")
  const codeKind = createSignalObject<string>(inputs.search().art ?? "rabatt")
  const codeValue = createSignalObject("")
  const codeDiscountType = createSignalObject<string>("prozent")
  const codeDiscountValue = createSignalObject("")
  const codeTiers = createSignalObject("")
  const codeMaxTickets = createSignalObject("")
  const bulkPrefix = createSignalObject("")
  const bulkCount = createSignalObject("10")

  // Tariff drafts are keyed by the full event scope (org+event), never by
  // tier key alone: switching events/orgs resets every draft so values from
  // one event can never leak into another (A→B→A safe). Late mutation
  // answers from a previous scope are ignored via tariffGeneration.
  let tariffScopeKey = ""
  let tariffGeneration = 0
  const resetTariffDrafts = () => {
    phaseTier.set(inputs.search().tier ?? "")
    phaseName.set("")
    phasePrice.set("")
    phaseEndsAt.set("")
    phaseQuota.set("")
    codeKind.set(inputs.search().art ?? "rabatt")
    codeValue.set("")
    codeDiscountType.set("prozent")
    codeDiscountValue.set("")
    codeTiers.set("")
    codeMaxTickets.set("")
    bulkPrefix.set("")
    bulkCount.set("10")
  }
  createRenderEffect(() => {
    const next = JSON.stringify([inputs.search().org, page.orgId(), inputs.eventKey()])
    untrack(() => {
      if (next === tariffScopeKey) return
      tariffScopeKey = next
      tariffGeneration++
      busy.set(false)
      message.set("")
      resetTariffDrafts()
    })
  })

  const guard = (allowed: boolean): boolean => {
    if (allowed) return true
    message.set("Keine Berechtigung für diesen Bereich.")
    return false
  }

  const createPhase = async (event: SubmitEvent) => {
    event.preventDefault()
    const orgId = page.orgId()
    const eventKey = inputs.eventKey()
    const gate = tariffGeneration
    if (!orgId || busy.get() || !guard(canTickets())) return
    const priceCents = veranstalterDashboardPreiseEuroToCents(phasePrice.get())
    const tierKey = phaseTier.get().trim()
    if (tierKey === "" || priceCents === undefined || phaseName.get().trim() === "") {
      message.set("Ticketart, Name und Preis (z. B. 12,50) ausfüllen.")
      return
    }
    let endsAt: string | undefined
    if (phaseEndsAt.get() !== "") {
      const converted = adminEventReleaseDateTimeToIso(phaseEndsAt.get())
      if (!converted.success) {
        message.set("Phasenende: gültiges Datum mit Uhrzeit (Berlin) wählen.")
        return
      }
      endsAt = converted.data === "" ? undefined : converted.data
    }
    busy.set(true)
    try {
      const result = await mutations.upsertPhase(orgId, eventKey, {
        tierKey,
        name: phaseName.get().trim(),
        priceCents,
        ...(endsAt !== undefined ? { endsAt } : {}),
        ...(veranstalterDashboardPreiseIntOrUndefined(phaseQuota.get(), 1) !== undefined
          ? { quota: veranstalterDashboardPreiseIntOrUndefined(phaseQuota.get(), 1) as number }
          : {}),
      })
      if (gate !== tariffGeneration) return
      if (result && typeof result === "object" && "success" in result && result.success) {
        phaseName.set("")
        phasePrice.set("")
        phaseEndsAt.set("")
        phaseQuota.set("")
        message.set("Preisphase gespeichert.")
      } else {
        message.set("Preisphase konnte nicht gespeichert werden.")
      }
    } finally {
      if (gate === tariffGeneration) busy.set(false)
    }
  }

  const archivePhase = async (phaseId: string) => {
    const orgId = page.orgId()
    const gate = tariffGeneration
    if (!orgId || busy.get() || !guard(canTickets())) return
    busy.set(true)
    try {
      const result = await mutations.archivePhase(orgId, phaseId)
      if (gate !== tariffGeneration) return
      message.set(
        result && typeof result === "object" && "success" in result && result.success
          ? "Preisphase archiviert."
          : "Archivieren fehlgeschlagen.",
      )
    } finally {
      if (gate === tariffGeneration) busy.set(false)
    }
  }

  const createCode = async (event: SubmitEvent) => {
    event.preventDefault()
    const orgId = page.orgId()
    const eventKey = inputs.eventKey()
    const gate = tariffGeneration
    if (!orgId || busy.get() || !guard(canCodes())) return
    const kind = codeKind.get() === "zugang" ? ("zugang" as const) : ("rabatt" as const)
    const tierKeys = veranstalterDashboardPreiseTierKeys(codeTiers.get())
    if (kind === "zugang" && tierKeys.length === 0) {
      message.set("Zugangscode braucht mindestens eine Ticketart (Kommaliste).")
      return
    }
    let discountType: "prozent" | "betrag" | undefined
    let discountValue: number | undefined
    if (kind === "rabatt") {
      discountType = codeDiscountType.get() === "betrag" ? ("betrag" as const) : ("prozent" as const)
      if (discountType === "prozent") {
        const percent = Number(codeDiscountValue.get().replace(",", "."))
        if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
          message.set("Prozent zwischen 0 und 100 eingeben.")
          return
        }
        discountValue = Math.round(percent * 100)
      } else {
        discountValue = veranstalterDashboardPreiseEuroToCents(codeDiscountValue.get())
        if (discountValue === undefined || discountValue <= 0) {
          message.set("Betrag in Euro eingeben, z. B. 5,00.")
          return
        }
      }
    }
    busy.set(true)
    try {
      const result = await mutations.createCode(orgId, eventKey, {
        kind,
        ...(codeValue.get().trim() ? { code: codeValue.get().trim() } : {}),
        ...(discountType ? { discountType } : {}),
        ...(discountValue !== undefined ? { discountValue } : {}),
        ...(tierKeys.length > 0 ? { tierKeys } : {}),
        ...(veranstalterDashboardPreiseIntOrUndefined(codeMaxTickets.get(), 1) !== undefined
          ? { maxTickets: veranstalterDashboardPreiseIntOrUndefined(codeMaxTickets.get(), 1) as number }
          : {}),
      })
      if (gate !== tariffGeneration) return
      if (result && typeof result === "object" && "success" in result && result.success) {
        codeValue.set("")
        codeDiscountValue.set("")
        codeTiers.set("")
        codeMaxTickets.set("")
        message.set("Code gespeichert.")
      } else {
        message.set("Code konnte nicht gespeichert werden.")
      }
    } finally {
      if (gate === tariffGeneration) busy.set(false)
    }
  }

  const createBulkCodes = async (event: SubmitEvent) => {
    event.preventDefault()
    const orgId = page.orgId()
    const eventKey = inputs.eventKey()
    const gate = tariffGeneration
    if (!orgId || busy.get() || !guard(canCodes())) return
    const count = veranstalterDashboardPreiseIntOrUndefined(bulkCount.get(), 1)
    if (count === undefined || count > 500) {
      message.set("Anzahl zwischen 1 und 500 wählen.")
      return
    }
    const tierKeys = veranstalterDashboardPreiseTierKeys(codeTiers.get())
    if (codeKind.get() === "zugang" && tierKeys.length === 0) {
      message.set("Zugangscode braucht mindestens eine Ticketart (Kommaliste).")
      return
    }
    busy.set(true)
    try {
      const result = await mutations.createCode(orgId, eventKey, {
        kind: codeKind.get() === "zugang" ? ("zugang" as const) : ("rabatt" as const),
        ...(bulkPrefix.get().trim() ? { prefix: bulkPrefix.get().trim() } : {}),
        count,
        ...(tierKeys.length > 0 ? { tierKeys } : {}),
      })
      if (gate !== tariffGeneration) return
      if (result && typeof result === "object" && "success" in result && result.success) {
        message.set(`${(result.data as { codes: string[] }).codes.length} Codes erstellt.`)
      } else {
        message.set("Massenerstellung fehlgeschlagen.")
      }
    } finally {
      if (gate === tariffGeneration) busy.set(false)
    }
  }

  const toggleCode = async (codeId: string, active: boolean) => {
    const orgId = page.orgId()
    const gate = tariffGeneration
    if (!orgId || busy.get() || !guard(canCodes())) return
    busy.set(true)
    try {
      const result = await mutations.updateCode(orgId, codeId, { active: !active })
      if (gate !== tariffGeneration) return
      message.set(
        result && typeof result === "object" && "success" in result && result.success
          ? "Code umgeschaltet."
          : "Umschalten fehlgeschlagen.",
      )
    } finally {
      if (gate === tariffGeneration) busy.set(false)
    }
  }

  const deleteCode = async (codeId: string) => {
    const orgId = page.orgId()
    const gate = tariffGeneration
    if (!orgId || busy.get() || !guard(canCodes())) return
    busy.set(true)
    try {
      const result = await mutations.deleteCode(orgId, codeId)
      if (gate !== tariffGeneration) return
      message.set(
        result && typeof result === "object" && "success" in result && result.success
          ? "Code gelöscht."
          : "Löschen fehlgeschlagen (benutzte Codes bleiben erhalten).",
      )
    } finally {
      if (gate === tariffGeneration) busy.set(false)
    }
  }

  const scopeError = (): string | null => {
    const failed = [phases(), codes()].find((result) => result !== undefined && !result.success)
    return failed !== undefined && !failed.success ? failed.errorMessage : null
  }
  return {
    page,
    canTickets,
    canCodes,
    phases,
    codes,
    scopeError,
    busy: busy.get,
    message: message.get,
    phaseTier,
    phaseName,
    phasePrice,
    phaseEndsAt,
    phaseQuota,
    codeKind,
    codeValue,
    codeDiscountType,
    codeDiscountValue,
    codeTiers,
    codeMaxTickets,
    bulkPrefix,
    bulkCount,
    createPhase,
    archivePhase,
    createCode,
    createBulkCodes,
    toggleCode,
    deleteCode,
  }
}

export type VeranstalterDashboardPreisePageState = ReturnType<typeof veranstalterDashboardPreisePageStateCreate>
