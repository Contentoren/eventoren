import { describe, expect, test } from "bun:test"
import { veranstalterDashboardPageFrameStateCreate } from "./veranstalterDashboardPageFrameStateCreate.ts"
import type { VeranstalterDashboardShellView } from "./veranstalterDashboardShellStateCreate.ts"

const allViews: readonly VeranstalterDashboardShellView[] = ["loading", "login", "error", "empty", "select", "ready"]

function frameWith(view: VeranstalterDashboardShellView, organizationOptional?: boolean) {
  return veranstalterDashboardPageFrameStateCreate({
    view: () => view,
    organizationOptional: () => organizationOptional ?? false,
  })
}

describe("veranstalterDashboardPageFrameStateCreate ohne Organisations-Opt-out", () => {
  test("zeigt Inhalt nur bei ready", () => {
    for (const view of allViews) {
      const frame = frameWith(view)
      expect(frame.contentVisible()).toBe(view === "ready")
      expect(frame.emptyVisible()).toBe(view === "empty")
      expect(frame.selectionVisible()).toBe(view === "select")
    }
  })

  test("verhält sich ohne organizationOptional wie strikt organisationspflichtig", () => {
    const frame = veranstalterDashboardPageFrameStateCreate({ view: () => "empty" })
    expect(frame.contentVisible()).toBe(false)
  })
})

describe("veranstalterDashboardPageFrameStateCreate mit Organisations-Opt-out", () => {
  test("zeigt Inhalt bei empty, select und ready", () => {
    for (const view of ["empty", "select", "ready"] as const) {
      const frame = frameWith(view, true)
      expect(frame.contentVisible()).toBe(true)
      expect(frame.emptyVisible()).toBe(false)
      expect(frame.selectionVisible()).toBe(false)
    }
  })

  test("blockiert loading, login und error trotz Opt-out", () => {
    for (const view of ["loading", "login", "error"] as const) {
      expect(frameWith(view, true).contentVisible()).toBe(false)
    }
  })

  test("folgt reaktiven Zugriffsänderungen", () => {
    let view: VeranstalterDashboardShellView = "empty"
    let optional = false
    const frame = veranstalterDashboardPageFrameStateCreate({
      view: () => view,
      organizationOptional: () => optional,
    })
    expect(frame.contentVisible()).toBe(false)
    expect(frame.emptyVisible()).toBe(true)
    optional = true
    expect(frame.contentVisible()).toBe(true)
    expect(frame.emptyVisible()).toBe(false)
    view = "select"
    expect(frame.selectionVisible()).toBe(false)
    optional = false
    expect(frame.selectionVisible()).toBe(true)
    expect(frame.contentVisible()).toBe(false)
    view = "ready"
    optional = false
    expect(frame.contentVisible()).toBe(true)
    view = "loading"
    expect(frame.contentVisible()).toBe(false)
  })
})
