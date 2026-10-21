import { afterAll, expect, mock, test } from "bun:test"

const solidPath = "solid-js/dist/solid.js"
const solid = (await import(solidPath)) as typeof import("solid-js")
mock.module("solid-js", () => solid)
const { createRoot } = solid

function inputSignal<T>(value: T) {
  const [get, set] = solid.createSignal(value)
  return {
    get,
    set: (next: T) => {
      set(() => next)
    },
  }
}

const mutationCalls: { args: Record<string, unknown> }[] = []
let mutationResult: unknown = { success: true, data: { payoutId: "payout-1" } }

mock.module("#src/utils/convex_client/queryCreate.ts", () => ({
  queryCreate: () => () => undefined,
}))
mock.module("#src/utils/convex_client/mutationCreate.ts", () => ({
  mutationCreate: () => async (args: Record<string, unknown>) => {
    mutationCalls.push({ args })
    return mutationResult
  },
}))

type Shell = { activeOrganization: () => { permissions: string[] } | undefined }
let permissions: string[] = ["finanzen.sehen"]
mock.module("../../client/veranstalterDashboardPageStateCreate.ts", () => ({
  veranstalterDashboardPageStateCreate: (inputs: {
    orgId: () => string | undefined
    selectOrganization: (organizationId: string) => void
  }) => ({
    shell: {
      activeOrganization: (): Shell["activeOrganization"] extends never ? never : { permissions: string[] } => ({
        permissions,
      }),
    },
    orgId: inputs.orgId,
  }),
}))

const { veranstalterDashboardFinanzenPageStateCreate } = await import(
  "./veranstalterDashboardFinanzenPageStateCreate.ts"
)
afterAll(() => mock.restore())

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function harness(search: { org?: string; event?: string }) {
  const searchSignal = inputSignal<{ org?: string; event?: string }>(search)
  const changes: { org?: string; event?: string }[] = []
  let state!: ReturnType<typeof veranstalterDashboardFinanzenPageStateCreate>
  createRoot((dispose) => {
    state = veranstalterDashboardFinanzenPageStateCreate({
      search: searchSignal.get,
      changeSearch: (next) => {
        changes.push(next)
        searchSignal.set(next)
      },
    })
    void dispose
  })
  return { state, changes, searchSignal }
}

test("finanzen gating follows the finance permission", async () => {
  permissions = ["finanzen.sehen"]
  const open = harness({ org: "A" })
  await tick()
  expect(open.state.canRead()).toBe(true)
  permissions = ["einlass.nutzen"]
  const closed = harness({ org: "A" })
  await tick()
  expect(closed.state.canRead()).toBe(false)
  permissions = ["finanzen.sehen"]
})

test("selectEvent scopes the search to the chosen event", async () => {
  const { state, changes } = harness({ org: "A" })
  await tick()
  state.selectEvent("event-a")
  expect(changes).toEqual([{ org: "A", event: "event-a" }])
  state.selectEvent(undefined)
  expect(changes).toEqual([{ org: "A", event: "event-a" }, { org: "A" }])
})

test("recordPayout validates the euro amount before any transport", async () => {
  mutationCalls.length = 0
  const { state } = harness({ org: "A", event: "event-a" })
  await tick()
  state.setAmount("kein-betrag")
  await state.recordPayout({ preventDefault: () => undefined } as unknown as SubmitEvent)
  expect(mutationCalls).toHaveLength(0)
  expect(state.message()).toContain("Euro")
})

test("recordPayout records integer cents and clears the form", async () => {
  mutationCalls.length = 0
  mutationResult = { success: true, data: { payoutId: "payout-1" } }
  const { state } = harness({ org: "A", event: "event-a" })
  await tick()
  state.setAmount("123,45")
  state.setNote("Teil 1")
  await state.recordPayout({ preventDefault: () => undefined } as unknown as SubmitEvent)
  expect(mutationCalls).toHaveLength(1)
  expect(mutationCalls[0]?.args).toMatchObject({ eventKey: "event-a", amountCents: 12345, note: "Teil 1" })
  expect(state.amount()).toBe("")
  expect(state.message()).toContain("vorgemerkt")
})
