import { expect, spyOn, test } from "bun:test"
import { createRoot } from "solid-js"
import { isServer } from "solid-js/web"
import { eventBookingReleaseStateCreate } from "../src/events/eventBookingReleaseStateCreate.ts"
import type { EventItem } from "../src/events/EventItem.ts"

if (isServer) {
  test("automatic booking release is verified with the browser Solid runtime", async () => {
    const subprocess = Bun.spawn(["bun", "--conditions=browser", "test", import.meta.path], {
      stdout: "pipe",
      stderr: "pipe",
    })
    const [exitCode, stdout, stderr] = await Promise.all([
      subprocess.exited,
      new Response(subprocess.stdout).text(),
      new Response(subprocess.stderr).text(),
    ])
    expect(exitCode, `${stdout}\n${stderr}`).toBe(0)
  })
} else {
  test("booking automatically opens at the server-based deadline and cleans up its timer", async () => {
    const deadline = Date.parse("2026-10-14T10:00:00.000Z")
    const clientTime = deadline + 60_000 // A fast visitor clock must not open booking early.
    const clock = spyOn(Date, "now").mockReturnValue(clientTime)
    let tick: (() => void) | undefined
    const interval = spyOn(globalThis, "setInterval").mockImplementation(((callback: () => void) => {
      tick = callback
      return 42
    }) as typeof setInterval)
    const clear = spyOn(globalThis, "clearInterval").mockImplementation(() => {})
    let dispose = () => {}
    try {
      const state = createRoot((cleanup) => {
        dispose = cleanup
        return eventBookingReleaseStateCreate({
          event: () => ({ bookingOpensAt: new Date(deadline).toISOString() }) as EventItem,
          observedAt: () => deadline - 1000,
        })
      })
      await Promise.resolve()
      expect(state.isOpen()).toBe(false)
      expect(tick).toBeDefined()
      clock.mockReturnValue(clientTime + 1000)
      tick!()
      expect(state.now()).toBe(deadline)
      expect(state.isOpen()).toBe(true)
      dispose()
      expect(clear).toHaveBeenCalledWith(42)
    } finally {
      dispose()
      clock.mockRestore()
      interval.mockRestore()
      clear.mockRestore()
    }
  })
}
