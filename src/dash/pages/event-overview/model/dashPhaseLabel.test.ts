import { describe, expect, test } from "bun:test"

import { dashPhaseLabel } from "./dashPhaseLabel.ts"

const now = new Date("2026-10-18T10:00:00.000Z")

function infoStub(overrides: Record<string, unknown> = {}) {
  return {
    phase: null,
    index: -1,
    state: "aktiv",
    nextPhase: null,
    endsReason: null,
    endsAt: null,
    remainingInPhase: null,
    ...overrides,
  } as unknown as Parameters<typeof dashPhaseLabel>[0]
}

describe("dashPhaseLabel", () => {
  test("meldet Ausverkauf zuerst", () => {
    expect(dashPhaseLabel(infoStub({ state: "ausverkauft" }), now)).toBe("Ausverkauft")
  })

  test("meldet Planung und Ende ohne Phase", () => {
    expect(dashPhaseLabel(infoStub({ phase: null, state: "geplant" }), now)).toBe("Geplant")
    expect(dashPhaseLabel(infoStub({ phase: null, state: "beendet" }), now)).toBe("Beendet")
  })

  test("hängt das Enddatum relativ an", () => {
    const info = infoStub({
      phase: { name: "Phase 1" },
      endsReason: "datum",
      endsAt: "2026-10-21T21:59:00.000Z",
    })
    expect(dashPhaseLabel(info, now)).toBe("Phase 1 · endet in 3 Tagen")
  })

  test("hängt das Kontingent an", () => {
    const info = infoStub({ phase: { name: "Early Bird" }, endsReason: "kontingent", remainingInPhase: 24 })
    expect(dashPhaseLabel(info, now)).toBe("Early Bird · ab 24 Tickets")
  })

  test("zeigt nur den Namen ohne Ende", () => {
    const info = infoStub({ phase: { name: "Regulär" } })
    expect(dashPhaseLabel(info, now)).toBe("Regulär")
  })
})
