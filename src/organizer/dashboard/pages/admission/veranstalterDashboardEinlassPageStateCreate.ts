import { createMemo, createRenderEffect, untrack } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import type { Result } from "#result"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { veranstalterDashboardPageStateCreate } from "../../client/veranstalterDashboardPageStateCreate.ts"
import { veranstalterDashboardEinlassMutationsCreate } from "./veranstalterDashboardEinlassMutationsCreate.ts"
import type { VeranstalterDashboardEinlassSearch } from "./veranstalterDashboardEinlassSearchParse.ts"

export type VeranstalterDashboardEinlassSources = {
  readonly checkin: (orgId: string, eventKey: string, entrance: string, ticketCode: string) => Promise<Result<unknown>>
  readonly revoke: (orgId: string, eventKey: string, entrance: string, ticketCode: string) => Promise<Result<unknown>>
}

/**
 * Live admission page state. Drafts and messages are keyed by the full
 * org+event scope; late mutation answers from a previous scope are ignored
 * (A→B→A safe).
 */
export function veranstalterDashboardEinlassPageStateCreate(inputs: {
  search: () => VeranstalterDashboardEinlassSearch
  changeSearch: (search: VeranstalterDashboardEinlassSearch) => void
  eventKey: () => string
  sources?: VeranstalterDashboardEinlassSources | undefined
}) {
  const requestedOrg = createMemo(() => inputs.search().org)
  const page = veranstalterDashboardPageStateCreate({
    orgId: requestedOrg,
    selectOrganization: (org) => inputs.changeSearch({ org }),
  })
  const permissions = () => page.shell.activeOrganization()?.permissions ?? []
  const canEnter = () => permissions().includes("einlass.nutzen")
  const canReadOrders = () => permissions().includes("bestellungen.sehen")
  const canView = () => canEnter() || canReadOrders()
  const canGrantLinks = () => permissions().includes("tickets.bearbeiten")
  const live = veranstalterDashboardEinlassMutationsCreate()
  const sources: VeranstalterDashboardEinlassSources = inputs.sources ?? live

  const stats = queryCreate(api.organizerDashboardAdmission.organizerDashboardAdmissionStatsQuery, () => {
    const orgId = page.orgId()
    if (!orgId || !canView()) return undefined
    return { orgId: orgId as Id<"orgs">, eventKey: inputs.eventKey() }
  })
  const links = queryCreate(api.organizerDashboardAdmission.organizerDashboardAdmissionScannerLinkListQuery, () => {
    const orgId = page.orgId()
    if (!orgId || !canEnter()) return undefined
    return { orgId: orgId as Id<"orgs">, eventKey: inputs.eventKey() }
  })

  const statsData = createMemo(() => {
    const current = stats()
    if (!current?.success) return undefined
    if (current.data.eventKey !== inputs.eventKey()) return undefined
    return current.data
  })

  const entrance = createSignalObject("Haupteingang")
  const ticketCode = createSignalObject("")
  const linkLabel = createSignalObject("")
  const linkEntrance = createSignalObject("")
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
      ticketCode.set("")
      linkLabel.set("")
      linkEntrance.set("")
    })
  })

  async function runScan(kind: "checkin" | "revoke") {
    const orgId = page.orgId()
    const code = ticketCode.get().trim()
    const gate = generation
    if (!orgId || !canEnter() || busy.get()) {
      if (!canEnter()) message.set("Keine Berechtigung: Einlass braucht das Einlassrecht.")
      return
    }
    if (!code || !entrance.get().trim()) {
      message.set("Eingang und Ticketcode eingeben.")
      return
    }
    busy.set(true)
    message.set("")
    try {
      const result =
        kind === "checkin"
          ? await sources.checkin(orgId, inputs.eventKey(), entrance.get().trim(), code)
          : await sources.revoke(orgId, inputs.eventKey(), entrance.get().trim(), code)
      if (gate !== generation) return
      message.set(
        result.success ? (kind === "checkin" ? "Eingecheckt." : "Check-in zurückgenommen.") : result.errorMessage,
      )
      if (result.success) ticketCode.set("")
    } finally {
      if (gate === generation) busy.set(false)
    }
  }

  const checkinSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    void runScan("checkin")
  }
  const revokeScan = () => {
    void runScan("revoke")
  }

  return {
    page,
    shell: page.shell,
    canEnter,
    canView,
    canGrantLinks,
    stats: statsData,
    statsError: () => {
      const current = stats()
      return current && !current.success ? current.errorMessage : null
    },
    links: createMemo(() => {
      const current = links()
      if (!current?.success) return []
      return current.data.links
    }),
    entrance,
    ticketCode,
    linkLabel,
    linkEntrance,
    busy: busy.get,
    message: message.get,
    checkinSubmit,
    revokeScan,
    createLink: async (event: SubmitEvent) => {
      event.preventDefault()
      const orgId = page.orgId()
      const gate = generation
      if (!orgId || !canGrantLinks() || busy.get()) return
      if (!linkLabel.get().trim()) {
        message.set("Namen für den Scanner-Link eingeben.")
        return
      }
      busy.set(true)
      try {
        const result = await live.createLink(
          orgId,
          inputs.eventKey(),
          linkLabel.get().trim(),
          linkEntrance.get(),
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        )
        if (gate !== generation) return
        message.set(result.success ? "Scanner-Link erstellt." : result.errorMessage)
        if (result.success) {
          linkLabel.set("")
          linkEntrance.set("")
          inputs.changeSearch({ org: inputs.search().org })
        }
      } finally {
        if (gate === generation) busy.set(false)
      }
    },
    revokeLink: async (linkId: string) => {
      const orgId = page.orgId()
      const gate = generation
      if (!orgId || !canGrantLinks() || busy.get()) return
      busy.set(true)
      try {
        const result = await live.revokeLink(orgId, linkId)
        if (gate !== generation) return
        message.set(result.success ? "Scanner-Link widerrufen." : result.errorMessage)
      } finally {
        if (gate === generation) busy.set(false)
      }
    },
  }
}

export type VeranstalterDashboardEinlassPageState = ReturnType<typeof veranstalterDashboardEinlassPageStateCreate>
