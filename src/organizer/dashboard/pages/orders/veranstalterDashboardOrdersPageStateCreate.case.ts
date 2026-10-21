import { afterAll, expect, mock, test } from "bun:test"
import type { ConvexClient } from "convex/browser"
import { getFunctionName } from "convex/server"
import { createResult, createResultError, type Result } from "#result"
import type { OrganizerDashboardOrderDetail } from "../../orders/model/organizerDashboardOrderDetail.ts"
import type { VeranstalterDashboardOrdersSearch } from "./veranstalterDashboardOrdersSearchParse.ts"

const solidPath = "solid-js/dist/solid.js"
const solid = (await import(solidPath)) as typeof import("solid-js")
mock.module("solid-js", () => solid)
const { createRoot, createComponent } = solid
// Harness inputs must use the exact client reactive graph, not Bun's
// package-condition resolved server build of Solid.
function inputSignal<T>(value: T) {
  const [get, set] = solid.createSignal(value)
  return {
    get,
    set: (next: T) => {
      set(() => next)
    },
  }
}
const { convexClientContext } = await import("#src/utils/convex_client/convexClientContext.ts")
const { eventorenAuthContext } = await import("#src/auth/ui/eventorenAuthContext.ts")
const { veranstalterDashboardOrdersPageStateCreate } = await import("./veranstalterDashboardOrdersPageStateCreate.ts")
const { veranstalterDashboardOrderMutationsCreate } = await import("./veranstalterDashboardOrderMutationsCreate.ts")
afterAll(() => mock.restore())

type Subscription = { name: string; args: Record<string, unknown>; active: boolean; push: (result: unknown) => void }
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
function harness(participants = false) {
  const subs: Subscription[] = [],
    calls: { name: string; args: Record<string, unknown> }[] = []
  const search = inputSignal<VeranstalterDashboardOrdersSearch>({ org: "A", order: "order-a", sheet: "order" })
  const token = inputSignal<string | null>("session-1")
  const eventKey = inputSignal<string | undefined>("event-a")
  const pending: { resolve: (value: Result<unknown>) => void; reject: (error: Error) => void }[] = []
  let deferMutations = false
  let state!: ReturnType<typeof veranstalterDashboardOrdersPageStateCreate>
  let mutations!: ReturnType<typeof veranstalterDashboardOrderMutationsCreate>
  const client = {
    onUpdate: (ref: never, args: Record<string, unknown>, push: (result: unknown) => void) => {
      const sub = { name: getFunctionName(ref).split(":")[1]!, args, active: true, push }
      subs.push(sub)
      return () => {
        sub.active = false
      }
    },
    mutation: async (ref: never, args: Record<string, unknown>) => {
      calls.push({ name: getFunctionName(ref).split(":")[1]!, args })
      if (deferMutations) {
        return new Promise<Result<unknown>>((resolve, reject) => pending.push({ resolve, reject }))
      }
      return createResult({})
    },
  } as unknown as ConvexClient
  const dispose = createRoot((dispose) => {
    createComponent(convexClientContext.Provider, {
      value: client,
      get children() {
        return createComponent(eventorenAuthContext.Provider, {
          value: {
            ...eventorenAuthContext.defaultValue,
            ready: () => true,
            identity: () => ({}) as never,
            token: token.get,
          },
          get children() {
            mutations = veranstalterDashboardOrderMutationsCreate()
            state = solid.untrack(() =>
              veranstalterDashboardOrdersPageStateCreate({
                search: search.get,
                changeSearch: search.set,
                eventKey: eventKey.get,
                participants,
              }),
            )
            return undefined
          },
        })
      },
    })
    return dispose
  })
  function push(name: string, value: unknown, org = search.get().org) {
    const sub = subs.findLast((sub) => sub.active && sub.name === name && sub.args.orgId === org)
    if (!sub) throw new Error(`Missing subscription ${name}:${org}`)
    sub.push(createResult(value))
  }
  function context(org = "A", entry = false, editable = true) {
    const organization = { id: org, name: org, slug: org, role: entry ? "einlass" : "inhaber", status: "aktiv" }
    push(
      "organizerDashboardContextQuery",
      {
        organizations: [organization],
        activeOrganization: {
          ...organization,
          profile: { name: org, slug: org },
          permissions: entry
            ? ["einlass.nutzen"]
            : ["bestellungen.sehen", ...(editable ? ["bestellungen.verwalten"] : []), "einlass.nutzen"],
        },
      },
      org,
    )
  }
  return {
    state, mutations, search, token, eventKey, subs, calls, push, context, dispose, pending,
    deferMutations: () => { deferMutations = true },
  }
}
function detailData(orderId = "order-a", email = "a@example.org"): OrganizerDashboardOrderDetail {
  return {
    orderId: orderId as never,
    bookingNumber: 1,
    eventKey: "event-a",
    eventTitle: "Event",
    eventStartsAt: "2026-10-01T10:00:00.000Z",
    status: "paid",
    paymentStatus: "paid",
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    paidAt: null,
    buyer: { givenName: "", familyName: "", email, phone: "" },
    subtotalCents: 1000,
    feeCents: 100,
    totalCents: 1100,
    historicalContact: { givenName: "", familyName: "", email: "history@example.org", phone: "", address: "" },
    operationalContact: { email },
    lines: [],
    tickets: [],
    notes: [],
    truncated: { lines: false, tickets: false, notes: false },
  }
}

const submitEvent = { preventDefault() {} } as SubmitEvent
function detailWithTickets(orderId = "order-a", name = "Server Name", email = "holder@example.org") {
  const data = detailData(orderId)
  data.tickets = [
    {
      ticketId: "ticket-a" as never,
      sequence: 1,
      tierName: "Standard",
      participantName: name,
      participantEmail: email,
      checkedInAt: null,
      cancelled: false,
      issuedAt: "2026-10-01T10:00:00.000Z",
    },
  ]
  return data
}
function visit(h: ReturnType<typeof harness>, order = "order-a", org = "A") {
  h.search.set({ org, order, sheet: "order" })
  h.context(org)
  h.push("organizerDashboardOrderGetQuery", detailWithTickets(order))
}

// These are provider-backed state tests, not DOM or browser tests. A new DTO
// deliberately includes a new ticket object, just as a live subscription does.
test("same-order live DTO replacement preserves dirty participant fields and reconciles pristine rows", () => {
  const h = harness()
  try {
    visit(h)
    expect(h.state.holderDraft("ticket-a")?.participantName).toBe("Server Name")
    h.push("organizerDashboardOrderGetQuery", detailWithTickets("order-a", "Authoritative Name"))
    expect(h.state.holderDraft("ticket-a")?.participantName).toBe("Authoritative Name")
    h.state.holderChange("ticket-a", "participantName", "Unsaved Name")
    h.state.holderChange("ticket-a", "participantEmail", "unsaved@example.org")
    const refresh = detailWithTickets("order-a", "Check-in Name", "updated@example.org")
    refresh.tickets[0]!.checkedInAt = "2026-10-02T10:00:00.000Z"
    h.push("organizerDashboardOrderGetQuery", refresh)
    expect(h.state.holderDraft("ticket-a")).toEqual({
      participantName: "Unsaved Name", participantEmail: "unsaved@example.org",
    })
  } finally { h.dispose() }
})

test("participant drafts reset on order changes, ticket removal and edit permission loss", () => {
  const h = harness()
  try {
    visit(h)
    h.state.holderChange("ticket-a", "participantName", "Private draft A")
    visit(h, "order-b")
    expect(h.state.holderDraft("ticket-a")?.participantName).toBe("Server Name")
    h.state.holderChange("ticket-a", "participantName", "Private draft B")
    h.push("organizerDashboardOrderGetQuery", detailData("order-b"))
    expect(h.state.holderDraft("ticket-a")).toBeUndefined()
    h.state.holderChange("ticket-a", "participantName", "Cannot resurrect removed ticket")
    h.state.holderSubmit("ticket-a", submitEvent)
    expect(h.calls).toHaveLength(0)
    h.push("organizerDashboardOrderGetQuery", detailWithTickets("order-b", "Reissued"))
    expect(h.state.holderDraft("ticket-a")?.participantName).toBe("Reissued")
    h.state.holderChange("ticket-a", "participantEmail", "private@example.org")
    h.context("A", false, false)
    expect(h.state.holderDraft("ticket-a")).toBeUndefined()
    h.state.holderSubmit("ticket-a", submitEvent)
    expect(h.calls).toHaveLength(0)
    h.context()
    h.push("organizerDashboardOrderGetQuery", detailWithTickets("order-b", "After permission regain"))
    expect(h.state.holderDraft("ticket-a")?.participantName).toBe("After permission regain")
    h.state.sheetClose()
    expect(h.state.holderDraft("ticket-a")).toBeUndefined()
  } finally { h.dispose() }
})

test("participant save snapshots only current ticket state and never reads an old native form", async () => {
  const h = harness()
  try {
    visit(h)
    h.deferMutations()
    h.state.holderChange("ticket-a", "participantName", "Captured Name")
    h.state.holderChange("ticket-a", "participantEmail", "captured@example.org")
    h.state.holderSubmit("not-in-current-order", submitEvent)
    expect(h.calls).toHaveLength(0)
    h.state.holderSubmit("ticket-a", {
      preventDefault() {},
      get currentTarget() { throw new Error("Detached native form must not be read") },
    } as unknown as SubmitEvent)
    expect(h.calls[0]?.args).toMatchObject({
      orgId: "A", orderId: "order-a", ticketId: "ticket-a",
      participantName: "Captured Name", participantEmail: "captured@example.org",
    })
    h.state.holderChange("ticket-a", "participantName", "Newer draft")
    h.pending[0]!.resolve(createResult({}))
    await tick()
    h.push("organizerDashboardOrderGetQuery", detailWithTickets("order-a", "Captured Name", "captured@example.org"))
    expect(h.state.holderDraft("ticket-a")?.participantName).toBe("Newer draft")
  } finally { h.dispose() }
})

test("pristine contact follows live values while deliberate form edits survive refreshes", () => {
  const h = harness()
  try {
    visit(h)
    h.push("organizerDashboardOrderGetQuery", detailData("order-a", "live@example.org"))
    expect(h.state.contact().email).toBe("live@example.org")
    h.state.contactChange("givenName", "Deliberate draft")
    h.push("organizerDashboardOrderGetQuery", detailData("order-a", "newer@example.org"))
    expect(h.state.contact()).toMatchObject({ givenName: "Deliberate draft", email: "live@example.org" })
  } finally { h.dispose() }
})

test("event context changes clear forms and pending; mismatched detail cannot be edited", async () => {
  const h = harness()
  try {
    visit(h)
    h.deferMutations()
    h.state.contactChange("email", "private@example.org")
    h.state.noteChange("private note")
    h.state.holderChange("ticket-a", "participantName", "private holder")
    h.state.contactSubmit(submitEvent)
    h.eventKey.set("event-b")
    expect(h.state.detail()).toBeUndefined()
    expect(h.state.detailError()).toContain("anderen Veranstaltung")
    expect(h.state.busy()).toBe(false)
    expect(h.state.contact().email).toBe("")
    expect(h.state.note()).toBe("")
    expect(h.state.holderDraft("ticket-a")).toBeUndefined()
    h.state.contactSubmit(submitEvent)
    h.state.noteSubmit(submitEvent)
    h.state.noteDelete("note-a")
    h.state.holderSubmit("ticket-a", submitEvent)
    expect(h.calls).toHaveLength(1)
    h.eventKey.set("event-a")
    expect(h.state.contact().email).toBe("a@example.org")
    h.pending[0]!.resolve(createResult({}))
    await tick()
    expect(h.state.message()).toBe("")
  } finally { h.dispose() }
})

const mutationActions = [
  { name: "contact", submit: (h: ReturnType<typeof harness>) => {
    h.state.contactChange("email", "saved@example.org")
    h.state.contactSubmit(submitEvent)
  } },
  { name: "note create", submit: (h: ReturnType<typeof harness>) => {
    h.state.noteChange("captured note")
    h.state.noteSubmit(submitEvent)
  } },
  { name: "note delete", submit: (h: ReturnType<typeof harness>) => h.state.noteDelete("note-a") },
  { name: "participant", submit: (h: ReturnType<typeof harness>) => {
    h.state.holderChange("ticket-a", "participantName", "Captured")
    h.state.holderSubmit("ticket-a", submitEvent)
  } },
]
for (const action of mutationActions) {
  for (const success of [true, false]) {
    test(`${action.name}: old A ${success ? "success" : "failure"} cannot affect a new A visit after A → B → A`, async () => {
      const h = harness()
      try {
        visit(h)
        h.deferMutations()
        action.submit(h)
        expect(h.state.busy()).toBe(true)
        visit(h, "order-b")
        expect(h.state.busy()).toBe(false)
        expect(h.state.message()).toBe("")
        visit(h)
        h.state.noteChange("new visit note")
        h.pending[0]!.resolve(success ? createResult({}) : createResultError("test", "old A failure"))
        await tick()
        expect(h.state.message()).toBe("")
        expect(h.state.note()).toBe("new visit note")
        expect(h.state.busy()).toBe(false)
        // A server result from an old visit is still current authoritative data,
        // but never a success/error message or a form-reset instruction.
        h.push("organizerDashboardOrderGetQuery", detailData("order-a", "saved@example.org"))
        expect(h.state.contact().email).toBe("saved@example.org")
      } finally { h.dispose() }
    })
  }
  test(`${action.name}: stale completion/finally cannot release B or a newer pending A request`, async () => {
    const h = harness()
    try {
      visit(h)
      h.deferMutations()
      action.submit(h)
      visit(h, "order-b")
      action.submit(h)
      expect(h.calls).toHaveLength(2)
      expect(h.state.busy()).toBe(true)
      h.pending[0]!.resolve(createResult({}))
      await tick()
      expect(h.state.busy()).toBe(true)
      expect(h.state.message()).toBe("")
      visit(h)
      action.submit(h)
      expect(h.calls).toHaveLength(3)
      h.pending[1]!.resolve(createResultError("test", "stale B failure"))
      await tick()
      expect(h.state.busy()).toBe(true)
      expect(h.state.message()).toBe("")
      h.pending[2]!.resolve(createResult({}))
      await tick()
      expect(h.state.busy()).toBe(false)
      expect(h.state.message()).toContain("Gespeichert")
    } finally { h.dispose() }
  })
}

test("all four mutations bind real provider contexts at setup and read the current token at invocation", async () => {
  const h = harness()
  try {
    await tick()
    h.token.set("session-2")
    expect((await h.mutations.createNote("A", "order-a", "note")).success).toBe(true)
    expect((await h.mutations.deleteNote("A", "order-a", "note-a")).success).toBe(true)
    expect((await h.mutations.updateBuyerContact("A", "order-a", { email: "ops@example.org" })).success).toBe(true)
    expect(
      (await h.mutations.updateParticipant("A", "order-a", "ticket-a", { participantName: "Holder" })).success,
    ).toBe(true)
    expect(h.calls.map((call) => call.name)).toEqual([
      "organizerDashboardOrderNoteCreateMutation",
      "organizerDashboardOrderNoteDeleteMutation",
      "organizerDashboardOrderBuyerContactUpdateMutation",
      "organizerDashboardOrderParticipantUpdateMutation",
    ])
    expect(h.calls.every((call) => call.args.token === "session-2")).toBe(true)
    h.token.set(null)
    expect((await h.mutations.createNote("A", "order-a", "blocked")).success).toBe(false)
    expect(h.calls).toHaveLength(4)
  } finally {
    h.dispose()
  }
})

test("live list advances an empty filtered page and URL changes resubscribe with the bound cursor", () => {
  const h = harness()
  try {
    h.context()
    h.push("organizerDashboardOrderListQuery", { page: [], isDone: false, continueCursor: "bound-cursor" })
    expect(h.state.orders()).toEqual([])
    expect(h.state.hasNext()).toBe(true)
    h.state.next()
    h.context()
    expect(h.search.get().cursor).toBe("bound-cursor")
    expect(h.subs.findLast((s) => s.name === "organizerDashboardOrderListQuery")?.args.paginationOpts).toEqual({
      numItems: 25,
      cursor: "bound-cursor",
    })
    h.state.queryChange(" buyer ")
    h.state.filtersSubmit({ preventDefault() {} } as SubmitEvent)
    expect(h.search.get()).toMatchObject({ q: "buyer", cursor: undefined })
    h.state.sheetClose()
    expect(h.search.get().sheet).toBeUndefined()
  } finally {
    h.dispose()
  }
})

test("switching organization/order clears contact and note drafts; stale subscription results are ignored", async () => {
  const h = harness()
  try {
    h.context()
    h.push("organizerDashboardOrderGetQuery", detailData())
    expect(h.state.contact().email).toBe("a@example.org")
    h.state.contactChange("email", "unsaved@example.org")
    h.state.noteChange("unsaved note")
    h.push("organizerDashboardOrderGetQuery", detailData("order-a", "server-update@example.org"))
    expect(h.state.contact().email).toBe("unsaved@example.org")
    const stale = h.subs.findLast((s) => s.name === "organizerDashboardOrderGetQuery")!
    h.search.set({ org: "B", order: "order-b", sheet: "order" })
    expect(h.state.contact().email).toBe("")
    expect(h.state.note()).toBe("")
    h.state.contactSubmit({ preventDefault() {} } as SubmitEvent)
    await tick()
    expect(h.calls).toHaveLength(0)
    h.context("B")
    h.push("organizerDashboardOrderGetQuery", detailData("order-b", "b@example.org"))
    stale.push(createResult(detailData("order-a", "stale@example.org")))
    expect(h.state.contact().email).toBe("b@example.org")
    h.state.contactSubmit({ preventDefault() {} } as SubmitEvent)
    await tick()
    expect(h.calls[0]?.args).toMatchObject({ orgId: "B", orderId: "order-b", email: "b@example.org" })
  } finally {
    h.dispose()
  }
})

test("entry page subscribes only to participant projection, never order list or detail", () => {
  const h = harness(true)
  try {
    h.context("A", true)
    expect(
      h.subs
        .filter((s) => s.active)
        .map((s) => s.name)
        .sort(),
    ).toEqual(["organizerDashboardContextQuery", "organizerDashboardOrderParticipantListQuery"].sort())
    expect(h.state.canRead()).toBe(false)
    expect(h.state.canEdit()).toBe(false)
    expect(h.state.sheetOpen()).toBe(false)
    h.push("organizerDashboardOrderParticipantListQuery", { page: [], isDone: true, continueCursor: "done" })
    expect(h.state.participants()).toEqual([])
    expect(h.state.hasNext()).toBe(false)
  } finally {
    h.dispose()
  }
})
