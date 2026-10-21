import { describe, expect, mock, test } from "bun:test"
import { createResult, type Result } from "#result"
import type { OrganizerDashboardEventCreate } from "#src/organizer/dashboard/events/model/organizerDashboardEventCreateSchema.ts"
import type { OrganizerDashboardEventDetail } from "#src/organizer/dashboard/events/model/organizerDashboardEventDetailCreate.ts"
import type { OrganizerDashboardEventPatch } from "#src/organizer/dashboard/events/model/organizerDashboardEventPatchSchema.ts"
import type { OrganizerDashboardTierUpsert } from "#src/organizer/dashboard/events/model/organizerDashboardTierUpsertSchema.ts"
import { veranstalterDashboardEventCreateDraftCacheCreate } from "./veranstalterDashboardEventCreateDraftCache.ts"
import type {
  VeranstalterDashboardEventCreateSources,
  VeranstalterDashboardEventCreateState,
  VeranstalterDashboardEventCreateStep,
  VeranstalterDashboardEventCreateWizardTarget,
} from "./veranstalterDashboardEventCreateStateCreate.ts"

const solidJsClientPath = "solid-js/dist/solid.js"
type SolidJsModule = typeof import("solid-js")
const solidJsClient = (await import(solidJsClientPath)) as unknown as SolidJsModule
mock.module("solid-js", () => solidJsClient)
const { createRoot, createSignal } = solidJsClient
const { veranstalterDashboardEventCreateStateCreate } = await import("./veranstalterDashboardEventCreateStateCreate.ts")
mock.restore()

const flushEffects = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

const validBase = {
  title: "Sommerfest",
  category: "Konzert",
  startsAtLocal: "2027-06-01T20:00",
  endsAtLocal: "2027-06-01T23:00",
  doorsAtLocal: "2027-06-01T19:00",
  venue: "Stadthalle",
  city: "Berlin",
}

function detailFixture(eventKey: string, title: string, tiers: OrganizerDashboardEventDetail["tiers"] = []) {
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
    imageUrl: "https://example.invalid/bild.jpg",
    imageAlt: "Bildbeschreibung",
    tags: [],
    status: "draft",
    catalogVersion: 1,
    eventRevision: 1,
    createdAt: "2027-01-01T00:00:00.000Z",
    updatedAt: "2027-01-01T00:00:00.000Z",
    tiers,
    tierOverflow: false,
  } as unknown as OrganizerDashboardEventDetail
}

type Harness = {
  readonly state: VeranstalterDashboardEventCreateState
  readonly created: { orgId: string; input: OrganizerDashboardEventCreate }[]
  readonly updated: { orgId: string; eventKey: string; patch: OrganizerDashboardEventPatch }[]
  readonly upserted: { orgId: string; eventKey: string; input: OrganizerDashboardTierUpsert & { tierKey?: string } }[]
  readonly published: { orgId: string; eventKey: string }[]
  readonly wizardTargets: VeranstalterDashboardEventCreateWizardTarget[]
  readonly toEventCalls: string[]
  readonly toListCalls: () => number
  readonly setStep: (step: VeranstalterDashboardEventCreateStep) => void
  readonly setEntwurf: (entwurf: string | undefined) => void
  readonly setTier: (tier: string | undefined) => void
  readonly setDraftResult: (result: Result<OrganizerDashboardEventDetail> | undefined) => void
  readonly setCanEdit: (canEdit: boolean) => void
}

function harnessCreate(options?: {
  readonly step?: VeranstalterDashboardEventCreateStep
  readonly entwurf?: string | undefined
  readonly tier?: string | undefined
  readonly canEdit?: boolean
}): Harness {
  const created: Harness["created"] = []
  const updated: Harness["updated"] = []
  const upserted: Harness["upserted"] = []
  const published: Harness["published"] = []
  const wizardTargets: Harness["wizardTargets"] = []
  const toEventCalls: string[] = []
  const toListCalls: number[] = []

  const [step, setStep] = createSignal<VeranstalterDashboardEventCreateStep>(options?.step ?? 0)
  const [entwurf, setEntwurf] = createSignal<string | undefined>(options?.entwurf)
  const [savedTier, setTier] = createSignal<string | undefined>(options?.tier)
  const [draftResult, setDraftResult] = createSignal<Result<OrganizerDashboardEventDetail> | undefined>(undefined)
  const [canEdit, setCanEdit] = createSignal(options?.canEdit ?? true)

  const sources: VeranstalterDashboardEventCreateSources = {
    createEvent: (orgId, input) => {
      created.push({ orgId, input })
      return Promise.resolve(createResult({ eventKey: "evt-neu-1" }))
    },
    updateEvent: (orgId, eventKey, patch) => {
      updated.push({ orgId, eventKey, patch })
      return Promise.resolve(createResult(null))
    },
    upsertTier: (orgId, eventKey, input) => {
      upserted.push({ orgId, eventKey, input })
      return Promise.resolve(createResult({ tierKey: input.tierKey ?? "tier-neu-1" }))
    },
    publishEvent: (orgId, eventKey) => {
      published.push({ orgId, eventKey })
      return Promise.resolve(createResult(null))
    },
    watchDraft: () => draftResult,
  }

  let state!: VeranstalterDashboardEventCreateState
  createRoot(() => {
    state = veranstalterDashboardEventCreateStateCreate({
      orgId: () => "org-1",
      orgActive: () => true,
      canEdit,
      step,
      draftKey: entwurf,
      savedTierKey: savedTier,
      toWizard: (next) => {
        wizardTargets.push(next)
        setStep(next.step)
        setEntwurf(next.entwurf)
        setTier(next.tier)
      },
      toEvent: (eventKey) => {
        toEventCalls.push(eventKey)
      },
      toList: () => {
        toListCalls.push(1)
      },
      sources,
      cache: veranstalterDashboardEventCreateDraftCacheCreate(),
    })
  })

  return {
    state,
    created,
    updated,
    upserted,
    published,
    wizardTargets,
    toEventCalls,
    toListCalls: () => toListCalls.length,
    setStep,
    setEntwurf,
    setTier,
    setDraftResult,
    setCanEdit,
  }
}

function fillBase(state: Harness["state"], overrides?: Partial<typeof validBase>) {
  const next = { ...validBase, ...overrides }
  for (const [field, value] of Object.entries(next)) {
    state.baseFieldChange(field as "title", value)
  }
}

function fillTier(state: Harness["state"]) {
  state.tierFieldChange("name", "Abendkasse")
  state.tierFieldChange("priceEuros", "12,50")
  state.tierFieldChange("capacity", "100")
}

describe("veranstalterDashboardEventCreateStateCreate persists backward edits on the server draft", () => {
  test("going back and changing the title calls the update mutation instead of creating again", async () => {
    const harness = harnessCreate()
    fillBase(harness.state)
    await harness.state.baseNext()
    expect(harness.created).toHaveLength(1)
    expect(harness.state.createdKey()).toBe("evt-neu-1")
    expect(harness.state.step()).toBe(1)

    harness.state.stepBack()
    expect(harness.state.step()).toBe(0)
    harness.state.baseFieldChange("title", "Sommerfest geändert")
    await harness.state.baseNext()

    expect(harness.created).toHaveLength(1)
    expect(harness.updated).toHaveLength(1)
    expect(harness.updated[0]?.eventKey).toBe("evt-neu-1")
    expect(harness.updated[0]?.patch.title).toBe("Sommerfest geändert")
    expect(harness.state.step()).toBe(1)
    expect(harness.state.failure()).toBeNull()
  })
})

describe("veranstalterDashboardEventCreateStateCreate upserts the tier instead of duplicating it", () => {
  test("the returned tier key is stored and sent on the next save", async () => {
    const harness = harnessCreate({ entwurf: "evt-1" })
    fillTier(harness.state)
    await harness.state.tierSave()

    expect(harness.upserted).toHaveLength(1)
    expect(harness.upserted[0]?.input.tierKey).toBeUndefined()
    expect(harness.state.savedTierKey()).toBe("tier-neu-1")
    expect(harness.state.step()).toBe(2)

    harness.state.stepBack()
    harness.state.tierFieldChange("capacity", "120")
    await harness.state.tierSave()

    expect(harness.upserted).toHaveLength(2)
    expect(harness.upserted[1]?.eventKey).toBe("evt-1")
    expect(harness.upserted[1]?.input.tierKey).toBe("tier-neu-1")
    expect(harness.upserted[1]?.input.capacity).toBe(120)
  })
})

describe("veranstalterDashboardEventCreateStateCreate resumes from URL draft and tier keys", () => {
  test("a reload restores the server draft and the saved tier without duplicating either", async () => {
    const harness = harnessCreate({ step: 1, entwurf: "evt-99", tier: "tier-7" })
    harness.setDraftResult(
      createResult(
        detailFixture("evt-99", "Geladener Entwurf", [
          {
            tierKey: "tier-7",
            name: "Abend",
            description: "",
            startsAt: "2027-06-01T18:00:00.000Z",
            doorsAt: "2027-06-01T17:00:00.000Z",
            endsAt: "2027-06-01T21:00:00.000Z",
            priceCents: 1250,
            capacity: 80,
            reserved: 0,
            sold: 0,
            available: 80,
            sortOrder: 0,
          },
        ]),
      ),
    )
    await flushEffects()

    expect(harness.state.createdKey()).toBe("evt-99")
    expect(harness.state.step()).toBe(1)
    expect(harness.state.base().title).toBe("Geladener Entwurf")
    expect(harness.state.tier().name).toBe("Abend")
    expect(harness.state.tier().capacity).toBe("80")
    expect(harness.created).toHaveLength(0)

    harness.state.stepBack()
    harness.state.baseFieldChange("title", "Geladener Entwurf v2")
    await harness.state.baseNext()
    expect(harness.created).toHaveLength(0)
    expect(harness.updated).toHaveLength(1)
    expect(harness.updated[0]?.eventKey).toBe("evt-99")
  })
})

describe("veranstalterDashboardEventCreateStateCreate locks the wizard without edit permission", () => {
  test("finance and entry roles see a read-only state and no mutation runs", async () => {
    const harness = harnessCreate({ canEdit: false })
    expect(harness.state.isLocked()).toBe(true)

    fillBase(harness.state)
    await harness.state.baseNext()

    expect(harness.created).toHaveLength(0)
    expect(harness.state.step()).toBe(0)
    expect(harness.state.failure()).not.toBeNull()
  })
})
