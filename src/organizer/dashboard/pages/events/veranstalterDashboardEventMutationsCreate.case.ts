import { describe, expect, mock, test } from "bun:test"
import type { ConvexClient } from "convex/browser"
import { getFunctionName } from "convex/server"
import { createResult } from "#result"

const solidJsClientPath = "solid-js/dist/solid.js"
type SolidJsModule = typeof import("solid-js")
const solidJsClient = (await import(solidJsClientPath)) as unknown as SolidJsModule
mock.module("solid-js", () => solidJsClient)
const { createComponent, createRoot, createSignal } = solidJsClient
const { api } = await import("#convex/_generated/api.js")
const { eventorenAuthContext } = await import("#src/auth/ui/eventorenAuthContext.ts")
const { convexClientContext } = await import("#src/utils/convex_client/convexClientContext.ts")
const { veranstalterDashboardEventMutationsCreate } = await import("./veranstalterDashboardEventMutationsCreate.ts")
const { veranstalterDashboardEventCreateStateCreate } = await import("./veranstalterDashboardEventCreateStateCreate.ts")
const { veranstalterDashboardEventCreateDraftCacheCreate } = await import(
  "./veranstalterDashboardEventCreateDraftCache.ts"
)
mock.restore()

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

type MutationCall = {
  readonly reference: unknown
  readonly args: Record<string, unknown>
}

function functionNameOf(reference: unknown): string {
  return getFunctionName(reference as never)
}

function fakeConvexClientCreate(calls: MutationCall[]) {
  const client: {
    readonly mutation: (reference: unknown, args: Record<string, unknown>) => Promise<unknown>
    readonly onUpdate: () => () => void
  } = {
    mutation: async (reference: unknown, args: Record<string, unknown>) => {
      calls.push({ reference, args })
      const name = functionNameOf(reference)
      if (name === functionNameOf(api.organizerDashboardEvents.organizerDashboardEventCreateMutation)) {
        return createResult({ eventKey: "evt-neu-1" })
      }
      if (
        name === functionNameOf(api.organizerDashboardEvents.organizerDashboardTierUpsertMutation) ||
        name === functionNameOf(api.organizerDashboardEvents.organizerDashboardTierArchiveMutation)
      ) {
        return createResult({ tierKey: "tier-neu-1" })
      }
      return createResult(null)
    },
    onUpdate: () => () => undefined,
  }
  return client as unknown as ConvexClient
}

type Mutations = ReturnType<typeof veranstalterDashboardEventMutationsCreate>

function providerMutationsCreate() {
  const calls: MutationCall[] = []
  const [token, setToken] = createSignal<string | null>("validated-token")
  const [ready, setReady] = createSignal(true)
  let captured: Mutations | undefined
  const dispose = createRoot((disposeRoot) => {
    createComponent(convexClientContext.Provider, {
      value: fakeConvexClientCreate(calls),
      get children() {
        return createComponent(eventorenAuthContext.Provider, {
          value: { ...eventorenAuthContext.defaultValue, token, ready },
          get children() {
            captured = veranstalterDashboardEventMutationsCreate()
            return undefined
          },
        })
      },
    })
    return disposeRoot
  })
  if (!captured) throw new Error("veranstalterDashboardEventMutationsCreate was not captured inside the providers")
  return { calls, setToken, setReady, mutations: captured, dispose }
}

const createInput = {
  title: "Sommerfest",
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
}

describe("veranstalterDashboardEventMutationsCreate survives handler-time calls outside the setup owner", () => {
  test("all six mutations captured inside providers succeed from an ownerless async tick", async () => {
    const { calls, mutations, dispose } = providerMutationsCreate()
    dispose()
    await tick()

    const created = await mutations.createEvent("org-1", createInput)
    const updated = await mutations.updateEvent("org-1", "evt-1", { title: "Sommerfest v2" })
    const upserted = await mutations.upsertTier("org-1", "evt-1", {
      name: "Abendkasse",
      description: "",
      priceCents: 1250,
      capacity: 100,
    })
    const archivedTier = await mutations.archiveTier("org-1", "evt-1", "tier-1")
    const published = await mutations.publishEvent("org-1", "evt-1")
    const archivedEvent = await mutations.archiveEvent("org-1", "evt-1")

    if (!created.success) throw new Error("expected the create mutation to succeed")
    if (!upserted.success) throw new Error("expected the tier upsert to succeed")
    if (!archivedTier.success) throw new Error("expected the tier archive to succeed")
    expect(created.data).toMatchObject({ eventKey: "evt-neu-1" })
    expect(updated.success).toBe(true)
    expect(upserted.data).toMatchObject({ tierKey: "tier-neu-1" })
    expect(archivedTier.data).toMatchObject({ tierKey: "tier-neu-1" })
    expect(published.success).toBe(true)
    expect(archivedEvent.success).toBe(true)

    expect(calls).toHaveLength(6)
    expect(calls.map((call) => functionNameOf(call.reference))).toEqual([
      functionNameOf(api.organizerDashboardEvents.organizerDashboardEventCreateMutation),
      functionNameOf(api.organizerDashboardEvents.organizerDashboardEventUpdateMutation),
      functionNameOf(api.organizerDashboardEvents.organizerDashboardTierUpsertMutation),
      functionNameOf(api.organizerDashboardEvents.organizerDashboardTierArchiveMutation),
      functionNameOf(api.organizerDashboardEvents.organizerDashboardEventPublishMutation),
      functionNameOf(api.organizerDashboardEvents.organizerDashboardEventArchiveMutation),
    ])
    for (const call of calls) {
      expect(call.args).toMatchObject({ orgId: "org-1", token: "validated-token" })
    }
    expect(calls[0]?.args).toMatchObject({ title: "Sommerfest" })
    expect(calls[2]?.args).toMatchObject({ eventKey: "evt-1", name: "Abendkasse" })
    expect(calls[3]?.args).toMatchObject({ eventKey: "evt-1", tierKey: "tier-1" })
  })

  test("the token is read live at call time and logout blocks the transport", async () => {
    const { calls, mutations, setToken, setReady, dispose } = providerMutationsCreate()
    dispose()
    await tick()

    setToken("validated-token-2")
    await mutations.publishEvent("org-1", "evt-1")
    expect(calls).toHaveLength(1)
    expect(calls[0]?.args).toMatchObject({ token: "validated-token-2" })

    setReady(false)
    const blocked = await mutations.publishEvent("org-1", "evt-1")
    expect(blocked.success).toBe(false)
    expect(calls).toHaveLength(1)
  })
})

describe("veranstalterDashboardEventCreateStateCreate default sources stay bound after setup", () => {
  test("a valid step-0 form reaches the create mutation from a handler tick", async () => {
    const calls: MutationCall[] = []
    const [token] = createSignal<string | null>("validated-token")
    const [ready] = createSignal(true)
    const [step, setStep] = createSignal<0 | 1 | 2>(0)
    const wizardTargets: unknown[] = []
    let state: ReturnType<typeof veranstalterDashboardEventCreateStateCreate> | undefined
    createRoot(() => {
      createComponent(convexClientContext.Provider, {
        value: fakeConvexClientCreate(calls),
        get children() {
          return createComponent(eventorenAuthContext.Provider, {
            value: { ...eventorenAuthContext.defaultValue, token, ready },
            get children() {
              state = veranstalterDashboardEventCreateStateCreate({
                orgId: () => "org-1",
                orgActive: () => true,
                canEdit: () => true,
                step,
                draftKey: () => undefined,
                savedTierKey: () => undefined,
                toWizard: (next) => {
                  wizardTargets.push(next)
                  setStep(next.step)
                },
                toEvent: () => undefined,
                toList: () => undefined,
                cache: veranstalterDashboardEventCreateDraftCacheCreate(),
              })
              return undefined
            },
          })
        },
      })
    })
    if (!state) throw new Error("create state was not captured inside the providers")

    state.baseFieldChange("title", "Sommerfest")
    state.baseFieldChange("category", "Konzert")
    state.baseFieldChange("startsAtLocal", "2027-06-01T20:00")
    state.baseFieldChange("endsAtLocal", "2027-06-01T23:00")
    state.baseFieldChange("doorsAtLocal", "2027-06-01T19:00")
    state.baseFieldChange("venue", "Stadthalle")
    state.baseFieldChange("city", "Berlin")
    await tick()
    await state.baseNext()

    expect(calls).toHaveLength(1)
    expect(functionNameOf(calls[0]?.reference)).toBe(
      functionNameOf(api.organizerDashboardEvents.organizerDashboardEventCreateMutation),
    )
    expect(calls[0]?.args).toMatchObject({ orgId: "org-1", token: "validated-token", title: "Sommerfest" })
    expect(state.createdKey()).toBe("evt-neu-1")
    expect(state.failure()).toBeNull()
    expect(wizardTargets).toHaveLength(1)
  })
})
