import { expect, mock, test } from "bun:test"
import type { ConvexClient } from "convex/browser"
import { getFunctionName } from "convex/server"
import { createResult, type Result } from "#result"

const solidPath = "solid-js/dist/solid.js"
const solid = (await import(solidPath)) as typeof import("solid-js")
mock.module("solid-js", () => solid)
const { createComponent, createRoot, createSignal } = solid

let shellPermissions: string[] = []

// Same specifier the page states import: one mock covers all importers.
mock.module("../../client/veranstalterDashboardPageStateCreate.ts", () => ({
  veranstalterDashboardPageStateCreate: (inputs: {
    orgId: () => string | undefined
    selectOrganization: (organizationId: string) => void
  }) => ({
    shell: {
      activeOrganization: () => {
        const orgId = inputs.orgId()
        if (!orgId) return undefined
        return { id: orgId, permissions: shellPermissions }
      },
    },
    orgId: inputs.orgId,
  }),
}))

const { api } = await import("#convex/_generated/api.js")
const { eventorenAuthContext } = await import("#src/auth/ui/eventorenAuthContext.ts")
const { convexClientContext } = await import("#src/utils/convex_client/convexClientContext.ts")
const { veranstalterDashboardPreisePageStateCreate } = await import("./veranstalterDashboardPreisePageStateCreate.ts")
const { veranstalterDashboardEinlassPageStateCreate } = await import(
  "../admission/veranstalterDashboardEinlassPageStateCreate.ts"
)
const { veranstalterDashboardAbendkassePageStateCreate } = await import(
  "../boxoffice/veranstalterDashboardAbendkassePageStateCreate.ts"
)
const { veranstalterEinstellungenPageStateCreate } = await import(
  "../organization/ui/veranstalterEinstellungenPageStateCreate.ts"
)
const { veranstalterDashboardEventDetailStateCreate } = await import(
  "../events/veranstalterDashboardEventDetailStateCreate.ts"
)
const { organizerDashboardEventDetailCreate } = await import(
  "../../events/model/organizerDashboardEventDetailCreate.ts"
)
mock.restore()

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
const submitEvent = { preventDefault: () => undefined } as unknown as SubmitEvent

type Sub = {
  readonly name: string
  readonly next: (result: unknown) => void
  active: boolean
}

function providerHarnessCreate() {
  const subs: Sub[] = []
  const mutationCalls: { name: string; args: Record<string, unknown> }[] = []
  const mutationHandlers = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>()
  const [token, setToken] = createSignal<string | null>("validated-token")
  const [ready, setReady] = createSignal(true)
  const client = {
    mutation: async (reference: unknown, args: Record<string, unknown>) => {
      const name = getFunctionName(reference as never)
      mutationCalls.push({ name, args })
      return mutationHandlers.get(name)?.(args) ?? createResult(null)
    },
    onUpdate: (reference: unknown, _args: unknown, next: (result: unknown) => void) => {
      const sub: Sub = { name: getFunctionName(reference as never), next, active: true }
      subs.push(sub)
      return () => {
        sub.active = false
      }
    },
  } as unknown as ConvexClient
  const withProviders = <T>(run: () => T): T => {
    let captured!: T
    const dispose = createRoot((disposeRoot) => {
      createComponent(convexClientContext.Provider, {
        value: client,
        get children() {
          return createComponent(eventorenAuthContext.Provider, {
            value: { ...eventorenAuthContext.defaultValue, token, ready },
            get children() {
              captured = run()
              return undefined
            },
          })
        },
      })
      return disposeRoot
    })
    void dispose
    return captured
  }
  const emit = (name: string, result: unknown) => {
    const live = subs.filter((sub) => sub.name === name && sub.active)
    for (const sub of live) sub.next(result)
  }
  const emitLatest = (name: string, result: unknown) => {
    const live = subs.filter((sub) => sub.name === name && sub.active)
    live[live.length - 1]?.next(result)
  }
  return { withProviders, emit, emitLatest, subs, mutationCalls, mutationHandlers, setToken, setReady }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((inner) => {
    resolve = inner
  })
  return { promise, resolve }
}

const profileOk = (orgId: string, bank: { iban: string; holder: string } | null) => ({
  orgId,
  profile: {
    name: `Org ${orgId}`,
    kind: "verein",
    contact: { email: "a@example.de", phone: "" },
    imprint: "Impressum",
  },
  bank,
  contracts: { termsAccepted: false, dpaAccepted: false, current: false },
  canAcceptContracts: false,
})

function detailFixture(eventKey: string, tierName: string) {
  const event = {
    _id: `event-${eventKey}`,
    eventKey,
    orgId: "org-a",
    title: `Event ${eventKey}`,
    subtitle: "",
    description: "",
    category: "konzert",
    startsAt: "2026-11-01T19:00:00.000Z",
    endsAt: "2026-11-01T23:00:00.000Z",
    doorsAt: "2026-11-01T18:00:00.000Z",
    venue: "Hof",
    city: "Berlin",
    address: "",
    organizer: "Org",
    imageUrl: "",
    imageAlt: "",
    tags: [],
    status: "draft",
    catalogVersion: 1,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
  }
  const tier = {
    _id: `tier-${eventKey}`,
    eventId: `event-${eventKey}`,
    tierKey: "standard",
    name: tierName,
    description: "",
    priceCents: 1000,
    feeCents: 0,
    capacity: 100,
    reserved: 0,
    sold: 0,
    sortOrder: 0,
    catalogVersion: 1,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
  }
  return organizerDashboardEventDetailCreate(event as never, [tier] as never, true)
}

test("tariff drafts reset on event switch and A-B-A never restores old drafts", async () => {
  shellPermissions = ["tickets.bearbeiten", "codes.bearbeiten"]
  const h = providerHarnessCreate()
  const [search, setSearch] = createSignal<{ org?: string; tier?: string }>({ org: "org-a", tier: "standard" })
  const [eventKey, setEventKey] = createSignal("evt-1")
  const state = h.withProviders(() =>
    veranstalterDashboardPreisePageStateCreate({
      search,
      changeSearch: (next) => setSearch(next),
      eventKey,
    }),
  )
  await tick()
  state.phaseName.set("Early Bird A")
  state.phasePrice.set("10,00")
  setEventKey("evt-2")
  await tick()
  expect(state.phaseName.get()).toBe("")
  expect(state.phasePrice.get()).toBe("")
  expect(state.phaseTier.get()).toBe("standard")
  state.phaseName.set("Phase B")
  setEventKey("evt-1")
  await tick()
  expect(state.phaseName.get()).toBe("")
  expect(state.message()).toBe("")
})

test("late tariff answers are ignored and submits freeze the event scope", async () => {
  shellPermissions = ["tickets.bearbeiten", "codes.bearbeiten"]
  const h = providerHarnessCreate()
  const [search, setSearch] = createSignal<{ org?: string; tier?: string }>({ org: "org-a" })
  const [eventKey, setEventKey] = createSignal("evt-1")
  const state = h.withProviders(() =>
    veranstalterDashboardPreisePageStateCreate({
      search,
      changeSearch: (next) => setSearch(next),
      eventKey,
    }),
  )
  await tick()
  const gate = deferred<Result<unknown>>()
  h.mutationHandlers.set(
    getFunctionName(api.organizerDashboardPricing.organizerDashboardPhaseUpsertMutation),
    () => gate.promise,
  )
  state.phaseTier.set("standard")
  state.phaseName.set("Early")
  state.phasePrice.set("12,50")
  const pending = state.createPhase(submitEvent)
  setEventKey("evt-2")
  await tick()
  gate.resolve(createResult({ phaseId: "p1" }))
  await pending
  await tick()
  // Frozen at submit (evt-1) and late answer ignored on evt-2.
  expect(h.mutationCalls[0]?.args).toMatchObject({ eventKey: "evt-1" })
  expect(state.message()).toBe("")
  expect(state.busy()).toBe(false)
})

test("settings A-B-A never shows stale org data and ignores late saves", async () => {
  const h = providerHarnessCreate()
  const [orgId, setOrgId] = createSignal<string | undefined>("org-a")
  const [permissions, setPermissions] = createSignal<readonly string[]>(["profil.bearbeiten", "bank.bearbeiten"])
  const state = h.withProviders(() => veranstalterEinstellungenPageStateCreate({ orgId, permissions }))
  await tick()
  const profileName = getFunctionName(api.organizerDashboardProfile.organizerDashboardOrganizationGetQuery)
  h.emit(profileName, createResult(profileOk("org-a", null)))
  await tick()
  expect(state.name.get()).toBe("Org org-a")
  setOrgId("org-b")
  await tick()
  expect(state.name.get()).toBe("")
  expect(state.serverError.get()).toBeNull()
  h.emit(profileName, createResult(profileOk("org-b", null)))
  await tick()
  expect(state.name.get()).toBe("Org org-b")
  // Slow save started on org-b, answered after returning to org-a: ignored.
  const gate = deferred<Result<unknown>>()
  h.mutationHandlers.set(
    getFunctionName(api.organizerDashboard.organizerDashboardOrganizationUpdateMutation),
    () => gate.promise,
  )
  const saving = state.submit()
  setOrgId("org-a")
  await tick()
  gate.resolve({ success: false, op: "x", errorMessage: "spät" })
  await saving
  await tick()
  expect(state.serverError.get()).toBeNull()
  h.emit(profileName, createResult(profileOk("org-a", null)))
  await tick()
  expect(state.name.get()).toBe("Org org-a")
})

test("bank redaction clears inputs and null-bank refresh keeps first drafts", async () => {
  const h = providerHarnessCreate()
  const [orgId] = createSignal<string | undefined>("org-a")
  const [permissions, setPermissions] = createSignal<readonly string[]>(["profil.bearbeiten", "bank.bearbeiten"])
  const state = h.withProviders(() => veranstalterEinstellungenPageStateCreate({ orgId, permissions }))
  await tick()
  const profileName = getFunctionName(api.organizerDashboardProfile.organizerDashboardOrganizationGetQuery)
  h.emit(profileName, createResult(profileOk("org-a", { iban: "DE89370400440532013000", holder: "Inhaber" })))
  await tick()
  expect(state.iban.get()).toBe("DE89370400440532013000")
  setPermissions(["profil.bearbeiten"])
  await tick()
  expect(state.iban.get()).toBe("")
  expect(state.bankHolder.get()).toBe("")
  // Editor draft survives ordinary null-bank refreshes of the same org.
  setPermissions(["profil.bearbeiten", "bank.bearbeiten"])
  await tick()
  h.emit(profileName, createResult(profileOk("org-a", null)))
  await tick()
  state.iban.set("DE89370400440532013000")
  await tick()
  h.emit(profileName, createResult(profileOk("org-a", null)))
  await tick()
  expect(state.iban.get()).toBe("DE89370400440532013000")
})

test("stale FAQ save errors never appear on the new event", async () => {
  const h = providerHarnessCreate()
  const [orgId] = createSignal<string | undefined>("org-a")
  const [eventKey, setEventKey] = createSignal("evt-1")
  const [detail, setDetail] = createSignal(detailFixture("evt-1", "Standard"))
  const gate = deferred<Result<unknown>>()
  const state = h.withProviders(() =>
    veranstalterDashboardEventDetailStateCreate({
      orgId,
      eventKey,
      tierKey: () => undefined,
      confirm: () => undefined,
      canEdit: () => true,
      canManageTiers: () => true,
      openTier: () => undefined,
      closeTier: () => undefined,
      openConfirm: () => undefined,
      closeConfirm: () => undefined,
      toList: () => undefined,
      sources: {
        updateEvent: () => gate.promise,
        upsertTier: (_o, _e, input) => Promise.resolve(createResult({ tierKey: input.tierKey ?? "neu" })),
        archiveTier: (_o, _e, tierKey) => Promise.resolve(createResult({ tierKey })),
        publishEvent: () => Promise.resolve(createResult(null)),
        archiveEvent: () => Promise.resolve(createResult(null)),
        watchDetail: () => () => createResult(detail()),
      },
    }),
  )
  await tick()
  state.faqAdd()
  const rows = state.faqRows()
  state.faqChange(rows[0]?.id ?? "", "question", "Wann?")
  state.faqChange(rows[0]?.id ?? "", "answer", "Um acht.")
  const saving = state.patchSave()
  setEventKey("evt-2")
  setDetail(detailFixture("evt-2", "Standard"))
  await tick()
  expect(state.failure()).toBeNull()
  gate.resolve({ success: false, op: "x", errorMessage: "spät" })
  await saving
  await tick()
  expect(state.failure()).toBeNull()
  expect(state.faqRows()).toEqual([])
})

test("tariff drafts are keyed by event scope, not tier key", async () => {
  const h = providerHarnessCreate()
  const [orgId] = createSignal<string | undefined>("org-a")
  const [eventKey, setEventKey] = createSignal("evt-1")
  const [tierKey, setTierKey] = createSignal<string | undefined>("standard")
  const [detail, setDetail] = createSignal(detailFixture("evt-1", "Standard A"))
  const state = h.withProviders(() =>
    veranstalterDashboardEventDetailStateCreate({
      orgId,
      eventKey,
      tierKey,
      confirm: () => undefined,
      canEdit: () => true,
      canManageTiers: () => true,
      openTier: () => undefined,
      closeTier: () => undefined,
      openConfirm: () => undefined,
      closeConfirm: () => undefined,
      toList: () => undefined,
      sources: {
        updateEvent: () => Promise.resolve(createResult(null)),
        upsertTier: (_o, _e, input) => Promise.resolve(createResult({ tierKey: input.tierKey ?? "neu" })),
        archiveTier: (_o, _e, key) => Promise.resolve(createResult({ tierKey: key })),
        publishEvent: () => Promise.resolve(createResult(null)),
        archiveEvent: () => Promise.resolve(createResult(null)),
        watchDetail: () => () => createResult(detail()),
      },
    }),
  )
  await tick()
  expect(state.tierDraft().name).toBe("Standard A")
  state.tierFieldChange("name", "Geändert")
  // Same tier key on another event: no draft inheritance.
  setEventKey("evt-2")
  setDetail(detailFixture("evt-2", "Standard B"))
  await tick()
  expect(state.tierDraft().name).toBe("Standard B")
})

test("admission scan drafts and messages reset on org switch, late answers ignored", async () => {
  shellPermissions = ["einlass.nutzen", "tickets.bearbeiten"]
  const h = providerHarnessCreate()
  const [search, setSearch] = createSignal<{ org?: string }>({ org: "org-a" })
  const [eventKey] = createSignal("evt-1")
  let gateRef = deferred<Result<unknown>>()
  const state = h.withProviders(() =>
    veranstalterDashboardEinlassPageStateCreate({
      search,
      changeSearch: (next) => setSearch(next),
      eventKey,
      sources: {
        checkin: () => gateRef.promise,
        revoke: () => Promise.resolve(createResult(null)),
      },
    }),
  )
  await tick()
  state.ticketCode.set("T-1")
  state.checkinSubmit(submitEvent)
  await tick()
  gateRef.resolve(createResult({ status: "checked-in" }))
  await tick()
  await tick()
  expect(state.message()).toBe("Eingecheckt.")
  // New scan, then org switch before the answer: ignored.
  state.ticketCode.set("T-2")
  gateRef = deferred<Result<unknown>>()
  state.checkinSubmit(submitEvent)
  setSearch({ org: "org-b" })
  await tick()
  expect(state.ticketCode.get()).toBe("")
  expect(state.message()).toBe("")
  gateRef.resolve(createResult({ status: "checked-in" }))
  await tick()
  await tick()
  expect(state.message()).toBe("")
  expect(state.busy()).toBe(false)
})

test("box-office drafts reset on event switch", async () => {
  shellPermissions = ["abendkasse.nutzen", "abendkasse.preise"]
  const h = providerHarnessCreate()
  const [search, setSearch] = createSignal<{ org?: string }>({ org: "org-a" })
  const [eventKey, setEventKey] = createSignal("evt-1")
  const state = h.withProviders(() =>
    veranstalterDashboardAbendkassePageStateCreate({
      search,
      changeSearch: (next) => setSearch(next),
      eventKey,
    }),
  )
  await tick()
  state.tierKey.set("abendkasse")
  state.quantity.set("3")
  setEventKey("evt-2")
  await tick()
  expect(state.tierKey.get()).toBe("")
  expect(state.quantity.get()).toBe("1")
  expect(state.message()).toBe("")
})
