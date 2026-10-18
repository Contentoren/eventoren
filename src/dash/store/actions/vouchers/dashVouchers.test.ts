import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import { dashStoreCreate, type DashStore } from "../../dashStoreCreate.ts"
import type { DashVoucher } from "../../../model/dashVoucherSchema.ts"
import { dashVoucherExpiry } from "../../../model/dashVoucherExpiry.ts"
import { dashVoucherCreate } from "./dashVoucherCreate.ts"
import { dashVoucherValidityChange } from "./dashVoucherValidityChange.ts"
import { dashVoucherDeactivate } from "./dashVoucherDeactivate.ts"
import { dashVoucherSend } from "./dashVoucherSend.ts"
import { dashVoucherStatusResolve } from "./dashVoucherStatusResolve.ts"

function vouchersStoreCreate(): DashStore {
  return dashStoreCreate({
    storage: null,
    now: () => new Date("2026-10-18T10:00:00.000Z"),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
  })
}

function voucherFixture(overrides: Partial<DashVoucher> = {}): DashVoucher {
  return {
    id: "vou-test",
    orgId: "org-lindenhof",
    code: "GS-TESTCODE",
    initialCents: 5000,
    balanceCents: 5000,
    kind: "verkauft",
    recipientName: "Test Person",
    recipientEmail: "test@example.de",
    message: "Viel Spaß!",
    validity: "3-jahre-jahresende",
    expiresAt: "2029-12-31T22:59:00.000Z",
    status: "aktiv",
    createdAt: "2026-10-18T10:00:00.000Z",
    redemptions: [],
    ...overrides,
  }
}

describe("dashVoucherStatusResolve", () => {
  test("meldet abgelaufen bei überschrittenem Datum und offenem Guthaben", () => {
    const resolved = dashVoucherStatusResolve(
      voucherFixture({ expiresAt: "2026-10-17T22:00:00.000Z" }),
      new Date("2026-10-18T10:00:00.000Z"),
    )
    expect(resolved).toBe("abgelaufen")
  })

  test("bleibt eingelöst bei leerem Guthaben trotz abgelaufenem Datum", () => {
    const resolved = dashVoucherStatusResolve(
      voucherFixture({ balanceCents: 0, status: "eingeloest", expiresAt: "2026-10-17T22:00:00.000Z" }),
      new Date("2026-10-18T10:00:00.000Z"),
    )
    expect(resolved).toBe("eingeloest")
  })

  test("deaktiviert bleibt deaktiviert", () => {
    const resolved = dashVoucherStatusResolve(
      voucherFixture({ status: "deaktiviert", expiresAt: "2026-10-17T22:00:00.000Z" }),
      new Date("2026-10-18T10:00:00.000Z"),
    )
    expect(resolved).toBe("deaktiviert")
  })
})

describe("dashVoucherCreate", () => {
  test("legt einen Gutschein mit GS-Code und aktivem Status an", () => {
    const store = vouchersStoreCreate()
    try {
      const result = dashVoucherCreate(
        {
          orgId: "org-lindenhof",
          initialCents: 5000,
          kind: "verkauft",
          recipientName: "Mara Muster",
          recipientEmail: "mara@example.de",
          message: "Zum Geburtstag!",
          validity: "unbegrenzt",
          customDate: null,
        },
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Anlage schlug fehl")
      expect(result.data.code).toMatch(/^GS-[A-Z0-9]{8}$/)
      expect(result.data.balanceCents).toBe(5000)
      expect(result.data.status).toBe("aktiv")
      expect(result.data.expiresAt).toBeNull()
      expect(store.state.vouchers.some((voucher) => voucher.id === result.data.id)).toBe(true)
    } finally {
      store.dispose()
    }
  })

  test("rechnet „Gültig bis“ ab Ausstellung und lehnt Kleinstbeträge ab", () => {
    const store = vouchersStoreCreate()
    try {
      const small = dashVoucherCreate(
        {
          orgId: "org-lindenhof",
          initialCents: 50,
          kind: "verkauft",
          recipientName: "X",
          recipientEmail: "x@example.de",
          message: "",
          validity: "unbegrenzt",
          customDate: null,
        },
        store,
      )
      expect(small.success).toBe(false)
      const dated = dashVoucherCreate(
        {
          orgId: "org-lindenhof",
          initialCents: 1000,
          kind: "kostenlos",
          recipientName: "Y",
          recipientEmail: "y@example.de",
          message: "",
          validity: "1-jahr",
          customDate: null,
        },
        store,
      )
      expect(dated.success).toBe(true)
      if (!dated.success) throw new Error("Anlage mit Datum schlug fehl")
      expect(dated.data.expiresAt).toBe(dashVoucherExpiry(dated.data.createdAt, "1-jahr", null))
    } finally {
      store.dispose()
    }
  })
})

describe("dashVoucherValidityChange / dashVoucherDeactivate / dashVoucherSend", () => {
  test("ändert die Laufzeit und reaktiviert abgelaufene bei Zukunftsdatum", () => {
    const store = vouchersStoreCreate()
    try {
      const created = dashVoucherCreate(
        {
          orgId: "org-lindenhof",
          initialCents: 2000,
          kind: "verkauft",
          recipientName: "Z",
          recipientEmail: "z@example.de",
          message: "",
          validity: "datum",
          customDate: "2026-10-17",
        },
        store,
      )
      expect(created.success).toBe(true)
      if (!created.success) throw new Error("Anlage schlug fehl")
      // Simuliere: Ausstellungsdatum so, dass das Datum in der Vergangenheit liegt → abgelaufen
      const marked = store.update("test", (draft) => {
        const target = draft.vouchers.find((voucher) => voucher.id === created.data.id)
        if (!target) throw new Error("Gutschein fehlt")
        target.status = "abgelaufen"
      })
      expect(marked.success).toBe(true)
      const changed = dashVoucherValidityChange(created.data.id, "unbegrenzt", null, store)
      expect(changed.success).toBe(true)
      const updated = store.state.vouchers.find((voucher) => voucher.id === created.data.id)
      expect(updated?.expiresAt).toBeNull()
      expect(updated?.status).toBe("aktiv")
    } finally {
      store.dispose()
    }
  })

  test("deaktiviert und versendet nur mit E-Mail", () => {
    const store = vouchersStoreCreate()
    try {
      const target = store.state.vouchers.find((voucher) => voucher.id === "vou-geburtstag-50")
      expect(target).toBeDefined()
      if (!target) throw new Error("Seed-Gutschein fehlt")
      const deactivated = dashVoucherDeactivate(target.id, store)
      expect(deactivated.success).toBe(true)
      expect(store.state.vouchers.find((voucher) => voucher.id === target.id)?.status).toBe("deaktiviert")
      const again = dashVoucherDeactivate(target.id, store)
      expect(again.success).toBe(false)
      const sent = dashVoucherSend("vou-danke-100", store)
      expect(sent.success).toBe(true)
      if (!sent.success) throw new Error("Versand schlug fehl")
      expect(sent.data).toContain("@")
      expect(store.state.audit.at(-1)?.action).toContain("per E-Mail gesendet")
    } finally {
      store.dispose()
    }
  })
})
