import { expect, mock, test } from "bun:test"
import { createRoot, createSignal } from "solid-js"
import { isServer } from "solid-js/web"
import type { AdminEventItem } from "../src/admin/AdminEventItem.ts"

if (isServer) {
  test("action rejection handling works with reactive Solid state", async () => {
    const process = Bun.spawn(["bun", "--conditions=browser", "test", import.meta.path], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const [exitCode, stdout, stderr] = await Promise.all([
      process.exited,
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
    ])
    expect(exitCode, `${stdout}\n${stderr}`).toBe(0)
  })
} else {
  let rejectAction: (reason: Error) => void = () => {}
  mock.module("#src/utils/convex_client/mutationCreate.ts", () => ({
    mutationCreate: () => () =>
      new Promise((_resolve, reject) => {
        rejectAction = reject
      }),
  }))
  mock.module("#src/utils/convex_client/queryPaginatedCreate.ts", () => ({
    queryPaginatedCreate: () => ({ result: () => undefined, isDone: () => false, isLoading: () => true }),
  }))
  const { adminEventOverviewStateCreate } = await import("../src/admin/adminEventOverviewStateCreate.ts")
  for (const action of ["duplicate", "archive"] as const) {
    test(`${action} rejection clears current pending and ignores stale rejection`, async () => {
      let dispose = () => {}
      const setup = createRoot((d) => {
        dispose = d
        const [event, setEvent] = createSignal({
          id: "one",
          title: "one",
          status: "draft",
          tiers: [],
        } as unknown as AdminEventItem)
        return { setEvent, state: adminEventOverviewStateCreate({ event, onEdit: () => {}, onBookings: () => {} }) }
      })
      try {
        const { state, setEvent } = setup
        const click = () => (action === "duplicate" ? state.panelProps().onDuplicate() : state.panelProps().onArchive())
        const pending = () =>
          action === "duplicate" ? state.panelProps().duplicatePending : state.panelProps().archivePending
        click()
        expect(pending()).toBe(true)
        rejectAction(new Error("network"))
        await Promise.resolve()
        await Promise.resolve()
        expect(pending()).toBe(false)
        expect(state.panelProps().actionErrorMessage).toContain("konnte nicht")
        click()
        expect(pending()).toBe(true)
        setEvent({ id: "two", title: "two", status: "draft", tiers: [] } as unknown as AdminEventItem)
        rejectAction(new Error("network"))
        await Promise.resolve()
        await Promise.resolve()
        expect(pending()).toBe(false)
        expect(state.panelProps().actionErrorMessage).toBe("")
      } finally {
        dispose()
      }
    })
  }
}
