import { describe, expect, mock, test } from "bun:test"
import { createResult, type Result } from "#result"
import type { OrganizerDashboardEventDetail } from "#src/organizer/dashboard/events/model/organizerDashboardEventDetailCreate.ts"
import type { OrganizerDashboardEventPatch } from "#src/organizer/dashboard/events/model/organizerDashboardEventPatchSchema.ts"
import type { VeranstalterDashboardEventDetailConfirm } from "./veranstalterDashboardEventDetailSearchParse.ts"
import type {
  VeranstalterDashboardEventDetailSources,
  VeranstalterDashboardEventDetailState,
} from "./veranstalterDashboardEventDetailStateCreate.ts"

const solidJsClientPath = "solid-js/dist/solid.js"
type SolidJsModule = typeof import("solid-js")
const solidJsClient = (await import(solidJsClientPath)) as unknown as SolidJsModule
mock.module("solid-js", () => solidJsClient)
const { createRoot, createSignal } = solidJsClient
const { veranstalterDashboardEventDetailStateCreate } = await import("./veranstalterDashboardEventDetailStateCreate.ts")
mock.restore()

const flushEffects = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function tierFixture(tierKey: string, overrides?: Partial<OrganizerDashboardEventDetail["tiers"][number]>) {
  return {
    tierKey,
    name: "Abend",
    description: "Abendkasse",
    startsAt: "2027-06-01T18:00:00.000Z",
    doorsAt: "2027-06-01T17:00:00.000Z",
    endsAt: "2027-06-01T21:00:00.000Z",
    priceCents: 1250,
    capacity: 80,
    reserved: 0,
    sold: 3,
    available: 77,
    sortOrder: 0,
    ...overrides,
  }
}

function detailFixture(
  eventKey: string,
  title = "Sommerfest",
  tiers: OrganizerDashboardEventDetail["tiers"] = [],
  overrides?: Partial<OrganizerDashboardEventDetail>,
): OrganizerDashboardEventDetail {
  return {
    eventId: "evt-id-1",
    eventKey,
    orgId: "org-1",
    title,
    subtitle: "",
    description: "Beschreibung",
    category: "Konzert",
    startsAt: "2027-06-01T18:00:00.000Z",
    endsAt: "2027-06-01T21:00:00.000Z",
    doorsAt: "2027-06-01T17:00:00.000Z",
    venue: "Stadthalle",
    city: "Berlin",
    address: "",
    organizer: "",
    imageUrl: "",
    imageAlt: "",
    tags: [],
    status: "draft",
    catalogVersion: 1,
    eventRevision: 1,
    createdAt: "2027-01-01T00:00:00.000Z",
    updatedAt: "2027-01-01T00:00:00.000Z",
    tiers,
    tierOverflow: false,
    ...overrides,
  } as unknown as OrganizerDashboardEventDetail
}

type Harness = {
  readonly state: VeranstalterDashboardEventDetailState
  readonly updated: { orgId: string; eventKey: string; patch: OrganizerDashboardEventPatch }[]
  readonly archivedEvents: { orgId: string; eventKey: string }[]
  readonly archivedTiers: { orgId: string; eventKey: string; tierKey: string }[]
  readonly published: { orgId: string; eventKey: string }[]
  readonly openedTiers: string[]
  readonly openedConfirms: VeranstalterDashboardEventDetailConfirm[]
  readonly closedTiersCalls: () => number
  readonly closedConfirmsCalls: () => number
  readonly toListCalls: () => number
  readonly setEventKey: (eventKey: string) => void
  readonly setTierKey: (tierKey: string | undefined) => void
  readonly setConfirm: (confirm: VeranstalterDashboardEventDetailConfirm | undefined) => void
  readonly setDetails: (entries: Record<string, Result<OrganizerDashboardEventDetail>>) => void
}

function harnessCreate(canEdit = true): Harness {
  const updated: Harness["updated"] = []
  const archivedEvents: Harness["archivedEvents"] = []
  const archivedTiers: Harness["archivedTiers"] = []
  const published: Harness["published"] = []
  const openedTiers: string[] = []
  const closedTiers: number[] = []
  const openedConfirms: VeranstalterDashboardEventDetailConfirm[] = []
  const closedConfirms: number[] = []
  const toListCalls: number[] = []

  const [eventKey, setEventKey] = createSignal("evt-1")
  const [tierKey, setTierKey] = createSignal<string | undefined>(undefined)
  const [confirm, setConfirm] = createSignal<VeranstalterDashboardEventDetailConfirm | undefined>(undefined)
  const [details, setDetails] = createSignal<Record<string, Result<OrganizerDashboardEventDetail>>>({})

  const sources: VeranstalterDashboardEventDetailSources = {
    updateEvent: (orgId, key, patch) => {
      updated.push({ orgId, eventKey: key, patch })
      return Promise.resolve(createResult(null))
    },
    upsertTier: (_orgId, _eventKey, input) => Promise.resolve(createResult({ tierKey: input.tierKey ?? "tier-neu-1" })),
    archiveTier: (orgId, key, tier) => {
      archivedTiers.push({ orgId, eventKey: key, tierKey: tier })
      return Promise.resolve(createResult({ tierKey: tier }))
    },
    publishEvent: (orgId, key) => {
      published.push({ orgId, eventKey: key })
      return Promise.resolve(createResult(null))
    },
    archiveEvent: (orgId, key) => {
      archivedEvents.push({ orgId, eventKey: key })
      return Promise.resolve(createResult(null))
    },
    watchDetail: (_orgId, key) => () => details()[key() ?? ""],
  }

  let state!: VeranstalterDashboardEventDetailState
  createRoot(() => {
    state = veranstalterDashboardEventDetailStateCreate({
      orgId: () => "org-1",
      eventKey,
      tierKey,
      confirm,
      canEdit: () => canEdit,
      canManageTiers: () => true,
      openTier: (tier) => {
        openedTiers.push(tier)
        setTierKey(tier)
      },
      closeTier: () => {
        closedTiers.push(1)
        setTierKey(undefined)
      },
      openConfirm: (kind) => {
        openedConfirms.push(kind)
        setConfirm(kind)
      },
      closeConfirm: () => {
        closedConfirms.push(1)
        setConfirm(undefined)
      },
      toList: () => {
        toListCalls.push(1)
      },
      sources,
    })
  })

  return {
    state,
    updated,
    archivedEvents,
    archivedTiers,
    published,
    openedTiers,
    closedTiersCalls: () => closedTiers.length,
    openedConfirms,
    closedConfirmsCalls: () => closedConfirms.length,
    toListCalls: () => toListCalls.length,
    setEventKey,
    setTierKey,
    setConfirm,
    setDetails: (entries) => setDetails(entries),
  }
}

describe("live FAQ and schedule editor", () => {
  const faqs = [{ id: "faq-existing", question: "Wo?", answer: "Hier" }]
  const schedule = [{ id: "slot-existing", time: "19:30", title: "Beginn", detail: "Bühne" }]

  test("canonical rows survive live updates while dirty; reload discards edits; deletion saves explicit empty arrays", async () => {
    const harness = harnessCreate()
    harness.setDetails({ "evt-1": createResult(detailFixture("evt-1", "Fest", [], { faqs, schedule })) })
    await flushEffects()
    harness.state.faqChange("faq-existing", "answer", "Lokal")
    harness.state.scheduleChange("slot-existing", "time", "20:00")
    const latestFaqs = [{ ...faqs[0]!, answer: "Server" }]
    harness.setDetails({ "evt-1": createResult(detailFixture("evt-1", "Fest", [], { faqs: latestFaqs, schedule })) })
    expect(harness.state.faqRows()[0]).toEqual({ ...faqs[0]!, answer: "Lokal" })
    expect(harness.state.scheduleRows()[0]?.time).toBe("20:00")
    harness.state.contentReload()
    expect(harness.state.faqRows()).toEqual(latestFaqs)
    expect(harness.state.scheduleRows()).toEqual(schedule)
    harness.state.faqDelete("faq-existing")
    harness.state.scheduleDelete("slot-existing")
    await harness.state.patchSave()
    expect(harness.updated[0]?.patch).toEqual({ faqs: [], schedule: [] })
    harness.setDetails({ "evt-1": createResult(detailFixture("evt-1", "Fest", [], { faqs: [], schedule: [] })) })
    expect(harness.state.faqRows()).toEqual([])
    expect(harness.state.scheduleRows()).toEqual([])
  })

  test("new row IDs remain stable through edits and saved values use shared validators", async () => {
    const harness = harnessCreate()
    harness.setDetails({ "evt-1": createResult(detailFixture("evt-1")) })
    await flushEffects()
    harness.state.faqAdd()
    harness.state.scheduleAdd()
    const faqId = harness.state.faqRows()[0]!.id
    const scheduleId = harness.state.scheduleRows()[0]!.id
    harness.state.faqChange(faqId, "question", "Was?")
    harness.state.faqChange(faqId, "answer", "Konzert")
    harness.state.scheduleChange(scheduleId, "time", "24:00")
    harness.state.scheduleChange(scheduleId, "title", "Beginn")
    await harness.state.patchSave()
    expect(harness.updated).toHaveLength(0)
    expect(harness.state.failure()).toContain("HH:mm")
    expect(harness.state.scheduleRows()[0]?.id).toBe(scheduleId)
    harness.state.scheduleChange(scheduleId, "time", "02:30")
    await harness.state.patchSave()
    expect(harness.updated[0]?.patch).toEqual({
      faqs: [{ id: faqId, question: "Was?", answer: "Konzert" }],
      schedule: [{ id: scheduleId, time: "02:30", title: "Beginn", detail: "" }],
    })
  })

  test("clear resets both lists and route changes cannot leak draft rows into another event", async () => {
    const harness = harnessCreate()
    harness.setDetails({
      "evt-1": createResult(detailFixture("evt-1", "Fest", [], { faqs, schedule })),
      "evt-2": createResult(detailFixture("evt-2")),
    })
    await flushEffects()
    harness.state.faqClear()
    harness.state.scheduleClear()
    expect(harness.state.faqRows()).toEqual([])
    expect(harness.state.scheduleRows()).toEqual([])
    harness.state.faqAdd()
    harness.setEventKey("evt-2")
    expect(harness.state.faqRows()).toEqual([])
    expect(harness.state.scheduleRows()).toEqual([])
    await harness.state.patchSave()
    expect(harness.updated).toHaveLength(0)
  })

  test("read-only users cannot change rows or send mutations", async () => {
    const harness = harnessCreate(false)
    harness.setDetails({ "evt-1": createResult(detailFixture("evt-1", "Fest", [], { faqs, schedule })) })
    await flushEffects()
    harness.state.faqChange("faq-existing", "answer", "No")
    harness.state.scheduleChange("slot-existing", "time", "20:00")
    harness.state.faqClear()
    harness.state.scheduleClear()
    harness.state.faqAdd()
    harness.state.scheduleAdd()
    await harness.state.patchSave()
    expect(harness.state.faqRows()).toEqual(faqs)
    expect(harness.state.scheduleRows()).toEqual(schedule)
    expect(harness.updated).toHaveLength(0)
  })
})

describe("veranstalterDashboardEventDetailStateCreate seeds the tier draft only after the tier loads", () => {
  test("a direct tier link waits for the matching tier and never resets local edits", async () => {
    const harness = harnessCreate()
    harness.setTierKey("tier-7")
    await flushEffects()

    expect(harness.state.sheetOpen()).toBe(true)
    expect(harness.state.tierDraft().name).toBe("")

    harness.setDetails({ "evt-1": createResult(detailFixture("evt-1", "Sommerfest", [tierFixture("tier-7")])) })
    await flushEffects()
    expect(harness.state.tierDraft().name).toBe("Abend")
    expect(harness.state.tierDraft().capacity).toBe("80")

    harness.state.tierFieldChange("name", "Abend geändert")
    harness.setDetails({
      "evt-1": createResult(
        detailFixture("evt-1", "Sommerfest", [tierFixture("tier-7", { description: "Live geändert" })]),
      ),
    })
    await flushEffects()
    expect(harness.state.tierDraft().name).toBe("Abend geändert")
  })
})

test("an injected watchDetail retaining the previous event cannot seed or save its tier into the next event", async () => {
  const harness = harnessCreate()
  const stale = createResult(detailFixture("evt-1", "Old event", [tierFixture("shared")]))
  harness.setDetails({ "evt-1": stale, "evt-2": stale })
  harness.setTierKey("shared")
  expect(harness.state.tierDraft().name).toBe("Abend")
  harness.setEventKey("evt-2")
  expect(harness.state.detail()).toBeUndefined()
  expect(harness.state.tierDraft().name).toBe("")
  harness.state.tierFieldChange("name", "New local draft")
  harness.state.tierFieldChange("priceEuros", "12")
  harness.state.tierFieldChange("capacity", "20")
  await harness.state.tierSave()
  expect(harness.state.failure()).toContain("geladen")
  expect(harness.closedTiersCalls()).toBe(0)
})

describe("veranstalterDashboardEventDetailStateCreate clears optional text and guards required text", () => {
  test("an emptied description is sent so it can be cleared", async () => {
    const harness = harnessCreate()
    harness.setDetails({ "evt-1": createResult(detailFixture("evt-1", "Sommerfest")) })
    await flushEffects()

    harness.state.patchFieldChange("description", "")
    await harness.state.patchSave()

    expect(harness.updated).toHaveLength(1)
    expect(harness.updated[0]?.patch.description).toBe("")
    expect(harness.updated[0]?.patch.title).toBeUndefined()
    expect(harness.state.failure()).toBeNull()
  })

  test("an emptied title fails validation instead of persisting", async () => {
    const harness = harnessCreate()
    harness.setDetails({ "evt-1": createResult(detailFixture("evt-1", "Sommerfest")) })
    await flushEffects()

    harness.state.patchFieldChange("title", "   ")
    await harness.state.patchSave()

    expect(harness.updated).toHaveLength(0)
    expect(harness.state.failure()).toContain("Veranstaltungstitel")
  })
})

describe("veranstalterDashboardEventDetailStateCreate follows the reactive event key", () => {
  test("an in-place route change reloads the detail without stale state", async () => {
    const harness = harnessCreate()
    harness.setDetails({
      "evt-1": createResult(detailFixture("evt-1", "Erstes Fest")),
      "evt-2": createResult(detailFixture("evt-2", "Zweites Fest")),
    })
    await flushEffects()
    expect(harness.state.detail()?.eventKey).toBe("evt-1")
    expect(harness.state.detail()?.title).toBe("Erstes Fest")

    harness.setEventKey("evt-2")
    await flushEffects()
    expect(harness.state.detail()?.eventKey).toBe("evt-2")
    expect(harness.state.detail()?.title).toBe("Zweites Fest")
  })
})

describe("veranstalterDashboardEventDetailStateCreate confirms before archiving", () => {
  test("requesting the event archive opens the dialog and confirming archives then leaves the list", async () => {
    const harness = harnessCreate()
    harness.setDetails({ "evt-1": createResult(detailFixture("evt-1", "Sommerfest")) })
    await flushEffects()

    harness.state.requestEventArchive()
    expect(harness.archivedEvents).toHaveLength(0)
    expect(harness.openedConfirms).toEqual(["veranstaltung-archiv"])

    await harness.state.confirmEventArchive()
    expect(harness.archivedEvents).toHaveLength(1)
    expect(harness.archivedEvents[0]?.eventKey).toBe("evt-1")
    expect(harness.toListCalls()).toBe(1)
  })

  test("requesting the tier archive opens the nested dialog and confirming archives then closes the sheet", async () => {
    const harness = harnessCreate()
    harness.setDetails({ "evt-1": createResult(detailFixture("evt-1", "Sommerfest", [tierFixture("tier-7")])) })
    await flushEffects()
    harness.setTierKey("tier-7")
    await flushEffects()

    harness.state.requestTierArchive()
    expect(harness.archivedTiers).toHaveLength(0)
    expect(harness.openedConfirms).toEqual(["tarif-archiv"])

    await harness.state.confirmTierArchive()
    expect(harness.archivedTiers).toHaveLength(1)
    expect(harness.archivedTiers[0]?.tierKey).toBe("tier-7")
  })

  test("a published event refuses the archive request without a mutation", async () => {
    const harness = harnessCreate()
    harness.setDetails({
      "evt-1": createResult(detailFixture("evt-1", "Live", [], { status: "published" })),
    })
    await flushEffects()

    harness.state.requestEventArchive()
    expect(harness.archivedEvents).toHaveLength(0)
    expect(harness.openedConfirms).toHaveLength(0)
    expect(harness.state.failure()).not.toBeNull()
  })
})
