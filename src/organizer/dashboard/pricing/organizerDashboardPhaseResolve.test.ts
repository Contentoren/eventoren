import { describe, expect, test } from "bun:test"
import { organizerDashboardPhaseResolve } from "./organizerDashboardPhaseResolve.ts"

const early = {
  phaseKey: "early",
  name: "Early Bird",
  priceCents: 1500,
  endsAt: "2026-11-01T00:00:00.000Z",
  quota: 100,
  soldCount: 10,
  sortOrder: 0,
}

const regular = {
  phaseKey: "regular",
  name: "Regulär",
  priceCents: 2200,
  endsAt: null,
  quota: null,
  soldCount: 0,
  sortOrder: 1,
}

describe("organizerDashboardPhaseResolve", () => {
  test("selects the first open phase before any deadline or quota", () => {
    const resolved = organizerDashboardPhaseResolve({
      phases: [early, regular],
      capacity: 500,
      salesStartAt: null,
      salesEndAt: null,
      nowIso: "2026-10-15T10:00:00.000Z",
    })
    expect(resolved.success).toBe(true)
    if (!resolved.success) return
    expect(resolved.data.phase?.phaseKey).toBe("early")
    expect(resolved.data.state).toBe("aktiv")
    expect(resolved.data.endsReason).toBe("datum")
    expect(resolved.data.remainingInPhase).toBe(90)
    expect(resolved.data.nextPhase?.phaseKey).toBe("regular")
  })

  test("advances automatically once the deadline passes", () => {
    const resolved = organizerDashboardPhaseResolve({
      phases: [early, regular],
      capacity: 500,
      salesStartAt: null,
      salesEndAt: null,
      nowIso: "2026-11-02T10:00:00.000Z",
    })
    expect(resolved.success).toBe(true)
    if (!resolved.success) return
    expect(resolved.data.phase?.phaseKey).toBe("regular")
    expect(resolved.data.index).toBe(1)
  })

  test("advances automatically once the phase quota is sold", () => {
    const resolved = organizerDashboardPhaseResolve({
      phases: [{ ...early, soldCount: 100 }, regular],
      capacity: 500,
      salesStartAt: null,
      salesEndAt: null,
      nowIso: "2026-10-15T10:00:00.000Z",
    })
    expect(resolved.success).toBe(true)
    if (!resolved.success) return
    expect(resolved.data.phase?.phaseKey).toBe("regular")
    expect(resolved.data.endsReason).toBeNull()
  })

  test("reports geplant before the sales window and beendet after it", () => {
    const before = organizerDashboardPhaseResolve({
      phases: [early],
      capacity: 500,
      salesStartAt: "2026-10-20T00:00:00.000Z",
      salesEndAt: null,
      nowIso: "2026-10-15T10:00:00.000Z",
    })
    expect(before.success && before.data.state).toBe("geplant")
    const after = organizerDashboardPhaseResolve({
      phases: [early],
      capacity: 500,
      salesStartAt: null,
      salesEndAt: "2026-10-15T09:00:00.000Z",
      nowIso: "2026-10-15T10:00:00.000Z",
    })
    expect(after.success && after.data.state).toBe("beendet")
  })

  test("reports ausverkauft when capacity is reached but a phase is still open", () => {
    const resolved = organizerDashboardPhaseResolve({
      phases: [
        { ...early, soldCount: 50 },
        { ...regular, soldCount: 450 },
      ],
      capacity: 500,
      salesStartAt: null,
      salesEndAt: null,
      nowIso: "2026-10-15T10:00:00.000Z",
    })
    expect(resolved.success).toBe(true)
    if (!resolved.success) return
    expect(resolved.data.state).toBe("ausverkauft")
    expect(resolved.data.phase?.phaseKey).toBe("early")
  })

  test("rejects an invalid now instant instead of guessing", () => {
    expect(
      organizerDashboardPhaseResolve({
        phases: [early],
        capacity: 500,
        salesStartAt: null,
        salesEndAt: null,
        nowIso: "kein-datum",
      }).success,
    ).toBe(false)
  })
})
