import { describe, expect, test } from "bun:test"
import { type DashStore, dashStoreCreate } from "../../dashStoreCreate.ts"
import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import { dashOrgSettingsUpdate } from "./dashOrgSettingsUpdate.ts"

function settingsTestStoreCreate(): DashStore {
  return dashStoreCreate({
    storage: null,
    now: () => new Date("2026-10-18T12:00:00.000Z"),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
  })
}

describe("dashOrgSettingsUpdate", () => {
  test("speichert Name, Art, Gutschein-Laufzeit und Standard-Steuersatz mit Audit", () => {
    const store = settingsTestStoreCreate()
    try {
      const result = dashOrgSettingsUpdate(
        {
          orgId: "org-lindenhof",
          patch: {
            name: "Kulturhaus Lindenhof – neu",
            kind: "unternehmen",
            tax: { defaultRateBps: 1900 },
            voucherDefaultValidity: "unbegrenzt",
          },
        },
        store,
      )
      expect(result.success).toBe(true)
      const org = store.state.orgs.find((candidate) => candidate.id === "org-lindenhof")
      expect(org?.name).toBe("Kulturhaus Lindenhof – neu")
      expect(org?.kind).toBe("unternehmen")
      expect(org?.tax.defaultRateBps).toBe(1900)
      expect(org?.voucherDefaultValidity).toBe("unbegrenzt")
      const audit = store.state.audit.at(-1)
      expect(audit?.area).toBe("einstellungen")
      expect(audit?.eventId).toBeNull()
      expect(audit?.action).toContain("Einstellungen aktualisiert")
      expect(audit?.action).toContain("Name")
    } finally {
      store.dispose()
    }
  })

  test("normiert den Slug und erkennt vergebene Profil-Links", () => {
    const store = settingsTestStoreCreate()
    try {
      const other = store.state.orgs.find((candidate) => candidate.id !== "org-lindenhof")
      const taken = dashOrgSettingsUpdate({ orgId: "org-lindenhof", patch: { slug: other?.slug } }, store)
      expect(taken.success).toBe(false)
      if (!taken.success) expect(taken.errorMessage).toContain("vergeben")
      const umlaut = dashOrgSettingsUpdate({ orgId: "org-lindenhof", patch: { slug: "Kulturhaus Lindenhof!" } }, store)
      expect(umlaut.success).toBe(true)
      expect(store.state.orgs.find((candidate) => candidate.id === "org-lindenhof")?.slug).toBe("kulturhaus-lindenhof")
    } finally {
      store.dispose()
    }
  })

  test("prüft IBAN und Kontoinhaber", () => {
    const store = settingsTestStoreCreate()
    try {
      const bad = dashOrgSettingsUpdate(
        { orgId: "org-lindenhof", patch: { bank: { holder: "Kulturhaus", iban: "DE00" } } },
        store,
      )
      expect(bad.success).toBe(false)
      const holder = dashOrgSettingsUpdate(
        { orgId: "org-lindenhof", patch: { bank: { holder: " ", iban: "DE75512108001245126199" } } },
        store,
      )
      expect(holder.success).toBe(false)
      const good = dashOrgSettingsUpdate(
        {
          orgId: "org-lindenhof",
          patch: { bank: { holder: "Kulturhaus Lindenhof e.V.", iban: "de75 5121 0800 1245 1261 99" } },
        },
        store,
      )
      expect(good.success).toBe(true)
      expect(store.state.orgs.find((candidate) => candidate.id === "org-lindenhof")?.bank.iban).toBe(
        "DE75512108001245126199",
      )
    } finally {
      store.dispose()
    }
  })

  test("lehnt ungültige Werte ab und meldet unbekannte Organisationen", () => {
    const store = settingsTestStoreCreate()
    try {
      const rate = dashOrgSettingsUpdate(
        // @ts-expect-error absichtlich ungültig: nur 700 oder 1900 erlaubt
        { orgId: "org-lindenhof", patch: { tax: { defaultRateBps: 500 } } },
        store,
      )
      expect(rate.success).toBe(false)
      const missing = dashOrgSettingsUpdate({ orgId: "org-unbekannt", patch: { name: "Neu" } }, store)
      expect(missing.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})
