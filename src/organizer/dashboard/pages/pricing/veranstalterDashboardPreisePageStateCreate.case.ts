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
const mutationResult: unknown = { success: true, data: { codes: ["X"] } }

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
let permissions: string[] = ["tickets.bearbeiten", "codes.bearbeiten"]
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

const { veranstalterDashboardPreisePageStateCreate } = await import("./veranstalterDashboardPreisePageStateCreate.ts")
afterAll(() => mock.restore())

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function harness(search: { org?: string; tier?: string; art?: "rabatt" | "zugang" }) {
  const searchSignal = inputSignal(search)
  let state!: ReturnType<typeof veranstalterDashboardPreisePageStateCreate>
  createRoot(() => {
    state = veranstalterDashboardPreisePageStateCreate({
      search: searchSignal.get,
      changeSearch: (next) => searchSignal.set(next),
      eventKey: () => "event-a",
    })
  })
  return { state }
}

test("preise gating follows the ticket and code permissions", async () => {
  permissions = ["tickets.bearbeiten", "codes.bearbeiten"]
  const open = harness({ org: "A" })
  await tick()
  expect(open.state.canTickets()).toBe(true)
  expect(open.state.canCodes()).toBe(true)
  permissions = ["einlass.nutzen"]
  const closed = harness({ org: "A" })
  await tick()
  expect(closed.state.canTickets()).toBe(false)
  expect(closed.state.canCodes()).toBe(false)
  permissions = ["tickets.bearbeiten", "codes.bearbeiten"]
})

test("createPhase validates tier, name and euro price before any transport", async () => {
  mutationCalls.length = 0
  const { state } = harness({ org: "A" })
  await tick()
  state.phaseTier.set("standard")
  state.phaseName.set("Early Bird")
  state.phasePrice.set("kein-preis")
  await state.createPhase({ preventDefault: () => undefined } as unknown as SubmitEvent)
  expect(mutationCalls).toHaveLength(0)
  expect(state.message()).toContain("Preis")
})

test("createCode refuses access codes without tier binding before any transport", async () => {
  mutationCalls.length = 0
  const { state } = harness({ org: "A" })
  await tick()
  state.codeKind.set("zugang")
  state.codeTiers.set("")
  await state.createCode({ preventDefault: () => undefined } as unknown as SubmitEvent)
  expect(mutationCalls).toHaveLength(0)
  expect(state.message()).toContain("Ticketart")
})

test("createBulkCodes bounds the batch size before any transport", async () => {
  mutationCalls.length = 0
  const { state } = harness({ org: "A" })
  await tick()
  state.codeKind.set("rabatt")
  state.bulkCount.set("501")
  await state.createBulkCodes({ preventDefault: () => undefined } as unknown as SubmitEvent)
  expect(mutationCalls).toHaveLength(0)
  expect(state.message()).toContain("500")
})
