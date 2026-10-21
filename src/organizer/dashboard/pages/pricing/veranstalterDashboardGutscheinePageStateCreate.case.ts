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
const mutationResult: unknown = { success: true, data: { voucherId: "voucher-1", code: "DANK-1" } }

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
let permissions: string[] = ["gutscheine.bearbeiten"]
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

const { veranstalterDashboardGutscheinePageStateCreate } = await import(
  "./veranstalterDashboardGutscheinePageStateCreate.ts"
)
afterAll(() => mock.restore())

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function harness(search: { org?: string }) {
  const searchSignal = inputSignal(search)
  let state!: ReturnType<typeof veranstalterDashboardGutscheinePageStateCreate>
  createRoot(() => {
    state = veranstalterDashboardGutscheinePageStateCreate({
      search: searchSignal.get,
      changeSearch: (next) => searchSignal.set(next),
    })
  })
  return { state }
}

test("gutscheine gating follows the voucher permission", async () => {
  permissions = ["gutscheine.bearbeiten"]
  const open = harness({ org: "A" })
  await tick()
  expect(open.state.canEdit()).toBe(true)
  permissions = ["einlass.nutzen"]
  const closed = harness({ org: "A" })
  await tick()
  expect(closed.state.canEdit()).toBe(false)
  permissions = ["gutscheine.bearbeiten"]
})

test("issue validates the euro amount before any transport", async () => {
  mutationCalls.length = 0
  const { state } = harness({ org: "A" })
  await tick()
  state.issueAmount.set("kein-betrag")
  await state.issue({ preventDefault: () => undefined } as unknown as SubmitEvent)
  expect(mutationCalls).toHaveLength(0)
  expect(state.message()).toContain("Euro")
})

test("issue requires a custom date for datum validity before any transport", async () => {
  mutationCalls.length = 0
  const { state } = harness({ org: "A" })
  await tick()
  state.issueAmount.set("25,00")
  state.issueValidity.set("datum")
  state.issueDate.set("")
  await state.issue({ preventDefault: () => undefined } as unknown as SubmitEvent)
  expect(mutationCalls).toHaveLength(0)
  expect(state.message()).toContain("Datum")
})

test("issue sends integer cents with validity and clears the form", async () => {
  mutationCalls.length = 0
  const { state } = harness({ org: "A" })
  await tick()
  state.issueAmount.set("25,00")
  state.issueValidity.set("1-jahr")
  state.issueName.set("Lea Schneider")
  await state.issue({ preventDefault: () => undefined } as unknown as SubmitEvent)
  expect(mutationCalls).toHaveLength(1)
  expect(mutationCalls[0]?.args).toMatchObject({
    initialCents: 2500,
    validity: "1-jahr",
    recipientName: "Lea Schneider",
  })
  expect(state.issueAmount.get()).toBe("")
  expect(state.message()).toContain("DANK-1")
})

test("redeem validates code, amount and order reference before any transport", async () => {
  mutationCalls.length = 0
  const { state } = harness({ org: "A" })
  await tick()
  state.redeemCode.set("DANK-1")
  state.redeemAmount.set("12,50")
  state.redeemOrder.set("")
  await state.redeem({ preventDefault: () => undefined } as unknown as SubmitEvent)
  expect(mutationCalls).toHaveLength(0)
  expect(state.message()).toContain("Bestellreferenz")
})
