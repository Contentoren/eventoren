import { describe, expect, test } from "bun:test"

import { dashRandomCreate } from "../../../model/dashRandomCreate.ts"
import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import { dashCheckinStats } from "../../../pages/checkin/model/dashCheckinStats.ts"
import { dashStoreCreate } from "../../dashStoreCreate.ts"
import { dashCheckinSimulateTick } from "./dashCheckinSimulateTick.ts"

const fixedNow = new Date("2026-10-18T10:00:00.000Z")

describe("dashCheckinSimulateTick", () => {
  test("erhöht checkedIn oder abgelehnte Scans ohne valid zu überschreiten", () => {
    const store = dashStoreCreate({ storage: null, now: () => fixedNow, seed: (now) => dashSeedCreate(now) })
    try {
      const before = dashCheckinStats(store.state, "ev-indie-night", fixedNow)
      const result = dashCheckinSimulateTick(
        { eventId: "ev-indie-night", random: dashRandomCreate(7), now: fixedNow },
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) return
      const after = dashCheckinStats(store.state, "ev-indie-night", fixedNow)
      expect(result.data.scans).toBeGreaterThanOrEqual(0)
      expect(result.data.scans).toBeLessThanOrEqual(3)
      expect(after.valid).toBe(before.valid)
      expect(after.checkedIn).toBeLessThanOrEqual(after.valid)
      expect(after.checkedIn >= before.checkedIn || after.rejected >= before.rejected).toBe(true)
    } finally {
      store.dispose()
    }
  })

  test("liefert 0 Scans wenn alle eingecheckt sind", () => {
    const store = dashStoreCreate({ storage: null, now: () => fixedNow, seed: (now) => dashSeedCreate(now) })
    try {
      store.update("test", (draft) => {
        for (const ticket of draft.tickets) {
          if (ticket.eventId !== "ev-indie-night" || ticket.status !== "gueltig") continue
          ticket.checkedInAt = fixedNow.toISOString()
          ticket.entrance = "Haupteingang"
        }
      })
      const before = store.state.scans.length
      const result = dashCheckinSimulateTick({ eventId: "ev-indie-night", random: () => 0.99, now: fixedNow }, store)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data.scans).toBe(0)
      expect(store.state.scans.length).toBe(before)
    } finally {
      store.dispose()
    }
  })
})
