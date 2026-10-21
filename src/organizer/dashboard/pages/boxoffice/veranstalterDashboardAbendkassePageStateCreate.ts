import { createMemo, createRenderEffect, untrack } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { veranstalterDashboardPageStateCreate } from "../../client/veranstalterDashboardPageStateCreate.ts"
import { veranstalterDashboardAbendkasseMutationsCreate } from "./veranstalterDashboardAbendkasseMutationsCreate.ts"
import type { VeranstalterDashboardAbendkasseSearch } from "./veranstalterDashboardAbendkasseSearchParse.ts"

function euroToCents(raw: string): number | undefined {
  const cents = Math.round(Number(raw.replace(/\s/g, "").replace(",", ".")) * 100)
  return Number.isInteger(cents) && cents >= 0 ? cents : undefined
}

/**
 * Box-office page state. Drafts are keyed by the full org+event scope; late
 * mutation answers from a previous scope are ignored (A→B→A safe).
 */
export function veranstalterDashboardAbendkassePageStateCreate(inputs: {
  search: () => VeranstalterDashboardAbendkasseSearch
  changeSearch: (search: VeranstalterDashboardAbendkasseSearch) => void
  eventKey: () => string
}) {
  const requestedOrg = createMemo(() => inputs.search().org)
  const page = veranstalterDashboardPageStateCreate({
    orgId: requestedOrg,
    selectOrganization: (org) => inputs.changeSearch({ org }),
  })
  const permissions = () => page.shell.activeOrganization()?.permissions ?? []
  const canUse = () => permissions().includes("abendkasse.nutzen")
  const canPrice = () => permissions().includes("abendkasse.preise")
  const mutations = veranstalterDashboardAbendkasseMutationsCreate()

  const sales = queryCreate(api.organizerDashboardBoxOffice.organizerDashboardBoxOfficeSaleListQuery, () => {
    const orgId = page.orgId()
    if (!orgId || !canUse()) return undefined
    return { orgId: orgId as Id<"orgs">, eventKey: inputs.eventKey() }
  })
  const rows = createMemo(() => {
    const current = sales()
    if (!current?.success) return []
    return current.data.sales
  })

  const tierKey = createSignalObject("")
  const quantity = createSignalObject("1")
  const unitPrice = createSignalObject("")
  const testSale = createSignalObject(false)
  const completeOrderId = createSignalObject("")
  const busy = createSignalObject(false)
  const message = createSignalObject("")
  let scopeKey = ""
  let generation = 0
  createRenderEffect(() => {
    const next = JSON.stringify([inputs.search().org, page.orgId(), inputs.eventKey()])
    untrack(() => {
      if (next === scopeKey) return
      scopeKey = next
      generation++
      busy.set(false)
      message.set("")
      tierKey.set("")
      quantity.set("1")
      unitPrice.set("")
      testSale.set(false)
      completeOrderId.set("")
    })
  })

  const createSale = async (event: SubmitEvent) => {
    event.preventDefault()
    const orgId = page.orgId()
    const gate = generation
    if (!orgId || !canPrice() || busy.get()) {
      if (!canPrice()) message.set("Keine Berechtigung: Preise legt nur das Abendkassen-Preisrecht fest.")
      return
    }
    const qty = Number(quantity.get())
    if (!tierKey.get().trim() || !Number.isInteger(qty) || qty < 1 || qty > 50) {
      message.set("Ticketart und Anzahl (1–50) angeben.")
      return
    }
    const cents = unitPrice.get().trim() === "" ? undefined : euroToCents(unitPrice.get())
    if (cents === undefined && unitPrice.get().trim() !== "") {
      message.set("Preis in Euro angeben, z. B. 28,00 — oder leer für den Tarifpreis.")
      return
    }
    busy.set(true)
    message.set("")
    try {
      const result = await mutations.createSale(orgId, inputs.eventKey(), {
        tierKey: tierKey.get().trim(),
        quantity: qty,
        ...(cents !== undefined ? { unitPriceCents: cents } : {}),
        ...(testSale.get() ? { testHarness: true as const } : {}),
      })
      if (gate !== generation) return
      message.set(result.success ? "Kassenvorgang angelegt." : result.errorMessage)
      if (result.success) {
        tierKey.set("")
        quantity.set("1")
        unitPrice.set("")
        testSale.set(false)
      }
    } finally {
      if (gate === generation) busy.set(false)
    }
  }

  return {
    page,
    shell: page.shell,
    canUse,
    canPrice,
    rows,
    salesError: () => {
      const current = sales()
      return current && !current.success ? current.errorMessage : null
    },
    tierKey,
    quantity,
    unitPrice,
    testSale,
    completeOrderId,
    busy: busy.get,
    message: message.get,
    createSale,
    cancelSale: async (saleId: string) => {
      const orgId = page.orgId()
      const gate = generation
      if (!orgId || !canPrice() || busy.get()) return
      busy.set(true)
      try {
        const result = await mutations.cancelSale(orgId, saleId)
        if (gate !== generation) return
        message.set(result.success ? "Vorgang abgebrochen." : result.errorMessage)
      } finally {
        if (gate === generation) busy.set(false)
      }
    },
    completeSale: async (saleId: string) => {
      const orgId = page.orgId()
      const gate = generation
      if (!orgId || !canPrice() || busy.get()) return
      if (!completeOrderId.get().trim()) {
        message.set("Bezahlte Bestell-ID für den echten Abschluss eingeben.")
        return
      }
      busy.set(true)
      try {
        const result = await mutations.completeSale(orgId, saleId, completeOrderId.get().trim())
        if (gate !== generation) return
        message.set(
          result.success ? `Abgeschlossen: ${result.data.checkedIn} Ticket(s) eingecheckt.` : result.errorMessage,
        )
        if (result.success) completeOrderId.set("")
      } finally {
        if (gate === generation) busy.set(false)
      }
    },
  }
}

export type VeranstalterDashboardAbendkassePageState = ReturnType<typeof veranstalterDashboardAbendkassePageStateCreate>
