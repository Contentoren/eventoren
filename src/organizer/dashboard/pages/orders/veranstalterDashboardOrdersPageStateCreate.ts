import { createMemo, createRenderEffect, untrack } from "solid-js"
import * as v from "valibot"
import { organizerDashboardOrderListFilterSchema } from "../../orders/model/organizerDashboardOrderListFilterSchema.ts"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import type { Result } from "#result"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { veranstalterDashboardPageStateCreate } from "../../client/veranstalterDashboardPageStateCreate.ts"
import type { OrganizerDashboardOrderSummary } from "../../orders/model/organizerDashboardOrderSummaryCreate.ts"
import type { OrganizerDashboardOrderParticipant } from "../../orders/model/organizerDashboardOrderParticipantCreate.ts"
import { veranstalterDashboardOrderMutationsCreate } from "./veranstalterDashboardOrderMutationsCreate.ts"
import type { VeranstalterDashboardOrdersSearch } from "./veranstalterDashboardOrdersSearchParse.ts"

type ParticipantDraft = {
  value: { participantName: string; participantEmail: string }
  dirty: boolean
}

export function veranstalterDashboardOrdersPageStateCreate(inputs: {
  search: () => VeranstalterDashboardOrdersSearch
  changeSearch: (search: VeranstalterDashboardOrdersSearch) => void
  eventKey: () => string | undefined
  participants: boolean
}) {
  // A cursor/sheet/search change must not tear down the organization context.
  const requestedOrg = createMemo(() => inputs.search().org)
  const page = veranstalterDashboardPageStateCreate({
    orgId: requestedOrg,
    selectOrganization: (org) => inputs.changeSearch({ org }),
  })
  const canRead = () => page.shell.activeOrganization()?.permissions.includes("bestellungen.sehen") ?? false
  const canEdit = () => page.shell.activeOrganization()?.permissions.includes("bestellungen.verwalten") ?? false
  const canParticipate = () =>
    canRead() || (page.shell.activeOrganization()?.permissions.includes("einlass.nutzen") ?? false)
  const mutations = veranstalterDashboardOrderMutationsCreate()
  const list = queryCreate(api.organizerDashboardOrders.organizerDashboardOrderListQuery, () => {
    const orgId = page.orgId()
    if (!orgId || inputs.participants || !canRead()) return undefined
    return {
      orgId: orgId as Id<"orgs">,
      eventKey: inputs.eventKey(),
      status: inputs.search().status,
      search: inputs.search().q,
      paginationOpts: { numItems: 25, cursor: inputs.search().cursor ?? null },
    }
  })
  const participants = queryCreate(api.organizerDashboardOrders.organizerDashboardOrderParticipantListQuery, () => {
    const orgId = page.orgId(),
      eventKey = inputs.eventKey()
    if (!orgId || !eventKey || !inputs.participants || !canParticipate()) return undefined
    return {
      orgId: orgId as Id<"orgs">,
      eventKey,
      search: inputs.search().q,
      paginationOpts: { numItems: 25, cursor: inputs.search().cursor ?? null },
    }
  })
  const detail = queryCreate(api.organizerDashboardOrders.organizerDashboardOrderGetQuery, () => {
    const orgId = page.orgId(),
      orderId = inputs.search().order
    if (!orgId || !orderId || inputs.search().sheet !== "order" || !canRead() || inputs.participants) return undefined
    return { orgId: orgId as Id<"orgs">, orderId: orderId as Id<"ticketOrders"> }
  })
  const current = () => (inputs.participants ? participants() : list())
  const detailData = createMemo(() => {
    const r = detail()
    if (
      !r?.success ||
      r.data.orderId !== inputs.search().order ||
      !page.orgId() ||
      inputs.search().sheet !== "order" ||
      !canRead() ||
      inputs.participants
    )
      return undefined
    if (inputs.eventKey() && r.data.eventKey !== inputs.eventKey()) return undefined
    return r.data
  })
  const draftQuery = createSignalObject(inputs.search().q ?? "")
  const status = createSignalObject<string>(inputs.search().status ?? "")
  const note = createSignalObject("")
  const contact = createSignalObject({ givenName: "", familyName: "", email: "", phone: "" })
  // In-memory only: the enclosing org/order selection scopes this ticket-ID map.
  // Never persist buyer, holder or note drafts in a shared browser.
  const holderDrafts = createSignalObject<ReadonlyMap<string, ParticipantDraft>>(new Map())
  const busy = createSignalObject(false)
  const message = createSignalObject("")
  let scopeKey = ""
  let selectionGeneration = 0
  let contactDirty = false
  let contactRevision = 0
  createRenderEffect(() => {
    draftQuery.set(inputs.search().q ?? "")
    status.set(inputs.search().status ?? "")
  })
  createRenderEffect(() => {
    const data = detailData()
    const editable = canEdit()
    const next = JSON.stringify([
      inputs.search().org,
      page.orgId(),
      inputs.search().order,
      inputs.eventKey(),
      inputs.search().sheet,
      canRead(),
      editable,
      !!data,
    ])
    // Only live scope/data are dependencies, never the drafts we reconcile.
    untrack(() => {
      if (next !== scopeKey) {
        scopeKey = next
        selectionGeneration++
        busy.set(false)
        message.set("")
        note.set("")
        contact.set({ givenName: "", familyName: "", email: "", phone: "" })
        contactDirty = false
        contactRevision = 0
        holderDrafts.set(new Map())
      }
      if (!data || !editable) return
      // Only overrides: blank means fallback to the historical contact.
      if (!contactDirty) {
        contact.set({
          givenName: data.operationalContact?.givenName ?? "",
          familyName: data.operationalContact?.familyName ?? "",
          email: data.operationalContact?.email ?? "",
          phone: data.operationalContact?.phone ?? "",
        })
      }
      const previous = holderDrafts.get()
      const reconciled = new Map<string, ParticipantDraft>()
      for (const ticket of data.tickets) {
        const draft = previous.get(ticket.ticketId)
        reconciled.set(
          ticket.ticketId,
          draft?.dirty
            ? draft
            : {
                value: { participantName: ticket.participantName, participantEmail: ticket.participantEmail },
                dirty: false,
              },
        )
      }
      // Removed tickets lose their drafts, even if dirty.
      holderDrafts.set(reconciled)
    })
  })
  async function run(operation: (org: string, order: string) => Promise<Result<unknown>>, after?: () => void) {
    const org = page.orgId(),
      order = detailData()?.orderId,
      generation = selectionGeneration
    if (!org || !order || !canEdit() || busy.get()) return
    busy.set(true)
    message.set("")
    try {
      const result = await operation(org, order)
      if (generation !== selectionGeneration) return
      message.set(result.success ? "Gespeichert. Kein E-Mail-Versand." : result.errorMessage)
      if (result.success) after?.()
    } finally {
      if (generation === selectionGeneration) busy.set(false)
    }
  }
  const filtersSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    const parsed = v.safeParse(organizerDashboardOrderListFilterSchema.entries.status, status.get() || undefined)
    if (!parsed.success) return
    inputs.changeSearch({
      ...inputs.search(),
      q: draftQuery.get().trim() || undefined,
      status: parsed.output,
      cursor: undefined,
    })
  }
  return {
    shell: page.shell,
    canRead,
    canEdit,
    canParticipate,
    participantsMode: inputs.participants,
    orders: () => {
      const r = list()
      return r?.success ? r.data.page : ([] as OrganizerDashboardOrderSummary[])
    },
    participants: () => {
      const r = participants()
      return r?.success ? r.data.page : ([] as OrganizerDashboardOrderParticipant[])
    },
    loading: () => current() === undefined,
    error: () => {
      const r = current()
      return r && !r.success ? r.errorMessage : ""
    },
    hasNext: () => {
      const r = current()
      return r?.success && !r.data.isDone
    },
    next: () => {
      const r = current()
      if (r?.success && !r.data.isDone) inputs.changeSearch({ ...inputs.search(), cursor: r.data.continueCursor })
    },
    first: () => inputs.changeSearch({ ...inputs.search(), cursor: undefined }),
    hasCursor: () => !!inputs.search().cursor,
    draftQuery: draftQuery.get,
    queryChange: (value: string) => draftQuery.set(value),
    statusSignal: status,
    statusOptions: () => [
      { type: "item" as const, value: "" },
      ...organizerDashboardOrderListFilterSchema.entries.status.wrapped.options.map((value) => ({
        type: "item" as const,
        value,
      })),
    ],
    filtersSubmit,
    openOrder: (orderId: string) => inputs.changeSearch({ ...inputs.search(), order: orderId, sheet: "order" }),
    sheetOpen: () => !inputs.participants && canRead() && inputs.search().sheet === "order" && !!inputs.search().order,
    sheetClose: () => inputs.changeSearch({ ...inputs.search(), order: undefined, sheet: undefined }),
    detail: detailData,
    detailError: () => {
      const r = detail()
      if (r && !r.success) return r.errorMessage
      if (r?.success && inputs.eventKey() && r.data.eventKey !== inputs.eventKey())
        return "Bestellung gehört zu einer anderen Veranstaltung."
      return ""
    },
    contact: contact.get,
    contactChange: (field: "givenName" | "familyName" | "email" | "phone", value: string) => {
      if (!canEdit() || !detailData()) return
      contactDirty = true
      contactRevision++
      contact.set({ ...contact.get(), [field]: value })
    },
    contactSubmit: (event: SubmitEvent) => {
      event.preventDefault()
      const input = { ...contact.get() }
      const revision = contactRevision
      void run(
        (org, order) => mutations.updateBuyerContact(org, order, input),
        () => {
          if (contactRevision === revision) contactDirty = false
        },
      )
    },
    note: note.get,
    noteChange: (value: string) => {
      if (canEdit() && detailData()) note.set(value)
    },
    noteSubmit: (event: SubmitEvent) => {
      event.preventDefault()
      const text = note.get()
      void run(
        (org, order) => mutations.createNote(org, order, text),
        () => {
          if (note.get() === text) note.set("")
        },
      )
    },
    noteDelete: (noteId: string) => void run((org, order) => mutations.deleteNote(org, order, noteId)),
    holderDraft: (ticketId: string) => holderDrafts.get().get(ticketId)?.value,
    holderChange: (ticketId: string, field: "participantName" | "participantEmail", value: string) => {
      const draft = holderDrafts.get().get(ticketId)
      if (!canEdit() || !detailData()?.tickets.some((ticket) => ticket.ticketId === ticketId) || !draft) return
      holderDrafts.set(
        new Map(holderDrafts.get()).set(ticketId, {
          value: { ...draft.value, [field]: value },
          dirty: true,
        }),
      )
    },
    holderSubmit: (ticketId: string, event: SubmitEvent) => {
      event.preventDefault()
      const draft = holderDrafts.get().get(ticketId)
      if (!draft || !detailData()?.tickets.some((ticket) => ticket.ticketId === ticketId)) return
      // Capture only this current target; detached forms are never a data source.
      const update = { ...draft.value }
      void run(
        (org, order) => mutations.updateParticipant(org, order, ticketId, update),
        () => {
          const current = holderDrafts.get().get(ticketId)
          if (current !== draft) return
          holderDrafts.set(new Map(holderDrafts.get()).set(ticketId, { ...current, dirty: false }))
        },
      )
    },
    busy: busy.get,
    message: message.get,
  }
}
export type VeranstalterDashboardOrdersPageState = ReturnType<typeof veranstalterDashboardOrdersPageStateCreate>
