import { describe, expect, test } from "bun:test"

import { dashScannerLinkUrl } from "../../../pages/checkin/model/dashScannerLinkUrl.ts"
import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import { dashStoreCreate } from "../../dashStoreCreate.ts"
import { dashScannerLinkCreate } from "./dashScannerLinkCreate.ts"
import { dashScannerLinkRevoke } from "./dashScannerLinkRevoke.ts"

const fixedNow = new Date("2026-10-18T10:00:00.000Z")

describe("dashScannerLinkCreate", () => {
  test("erzeugt einen Link mit 24-stelligem Token und URL", () => {
    const store = dashStoreCreate({ storage: null, now: () => fixedNow, seed: (now) => dashSeedCreate(now) })
    try {
      const result = dashScannerLinkCreate(
        { eventId: "ev-indie-night", label: "Abendkasse mobil", entrance: "Abendkasse" },
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.data.token).toMatch(/^[a-z0-9]{24}$/)
      expect(dashScannerLinkUrl(result.data)).toBe(`https://eventoren.de/scanner/${result.data.token}`)
      expect(store.state.scannerLinks.some((link) => link.id === result.data.id)).toBe(true)
    } finally {
      store.dispose()
    }
  })

  test("lehnt leere und zu lange Labels ab", () => {
    const store = dashStoreCreate({ storage: null, now: () => fixedNow, seed: (now) => dashSeedCreate(now) })
    try {
      expect(
        dashScannerLinkCreate({ eventId: "ev-indie-night", label: "  ", entrance: "Haupteingang" }, store).success,
      ).toBe(false)
      expect(
        dashScannerLinkCreate({ eventId: "ev-indie-night", label: "x".repeat(41), entrance: "Haupteingang" }, store)
          .success,
      ).toBe(false)
    } finally {
      store.dispose()
    }
  })

  test("sperrt einen Link genau einmal", () => {
    const store = dashStoreCreate({ storage: null, now: () => fixedNow, seed: (now) => dashSeedCreate(now) })
    try {
      const created = dashScannerLinkCreate(
        { eventId: "ev-indie-night", label: "Testsperre", entrance: "Seiteneingang" },
        store,
      )
      expect(created.success).toBe(true)
      if (!created.success) return
      expect(dashScannerLinkRevoke(created.data.id, store).success).toBe(true)
      expect(store.state.scannerLinks.find((link) => link.id === created.data.id)?.revokedAt).not.toBeNull()
      expect(dashScannerLinkRevoke(created.data.id, store).success).toBe(false)
      expect(dashScannerLinkRevoke("scanlink-unbekannt", store).success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})
