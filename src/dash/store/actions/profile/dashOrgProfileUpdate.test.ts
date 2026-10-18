import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import { dashStoreCreate, type DashStore } from "../../dashStoreCreate.ts"
import { dashOrgProfileUpdate } from "./dashOrgProfileUpdate.ts"

function dashProfileTestStoreCreate(): DashStore {
  return dashStoreCreate({
    storage: null,
    now: () => new Date(),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
  })
}

describe("dashOrgProfileUpdate", () => {
  test("speichert Untertitel und TikTok und schreibt ein Audit mit Feldnamen", () => {
    const store = dashProfileTestStoreCreate()
    try {
      const before = store.state.orgs.find((org) => org.id === "org-lindenhof")
      const result = dashOrgProfileUpdate(
        {
          orgId: "org-lindenhof",
          patch: { subtitle: "Dein Hof für Konzerte", socials: { ...before!.socials, tiktok: "lindenhof-live" } },
        },
        store,
      )
      expect(result.success).toBe(true)
      const after = store.state.orgs.find((org) => org.id === "org-lindenhof")
      expect(after?.subtitle).toBe("Dein Hof für Konzerte")
      expect(after?.socials.tiktok).toBe("lindenhof-live")
      expect(after?.socials.instagram).toBe(before?.socials.instagram)
      const audit = store.state.audit.at(-1)
      expect(audit?.area).toBe("profil")
      expect(audit?.action).toContain("Profil aktualisiert")
      expect(audit?.action).toContain("Untertitel")
      expect(audit?.action).toContain("Social Media (TikTok)")
    } finally {
      store.dispose()
    }
  })

  test("lehnt einen zu kurzen Namen und eine ungültige E-Mail ab", () => {
    const store = dashProfileTestStoreCreate()
    try {
      const nameResult = dashOrgProfileUpdate({ orgId: "org-lindenhof", patch: { name: "X" } }, store)
      expect(nameResult.success).toBe(false)
      if (!nameResult.success) expect(nameResult.errorMessage).toContain("2 Zeichen")
      const mailResult = dashOrgProfileUpdate({ orgId: "org-lindenhof", patch: { email: "keine-mail" } }, store)
      expect(mailResult.success).toBe(false)
      if (!mailResult.success) expect(mailResult.errorMessage).toContain("E-Mail")
      expect(store.state.orgs.find((org) => org.id === "org-lindenhof")?.name).not.toBe("X")
    } finally {
      store.dispose()
    }
  })

  test("lehnt einen vergebenen Profil-Link ab, akzeptiert den eigenen", () => {
    const store = dashProfileTestStoreCreate()
    try {
      const other = store.state.orgs.find((org) => org.id !== "org-lindenhof")
      const taken = dashOrgProfileUpdate({ orgId: "org-lindenhof", patch: { slug: other!.slug } }, store)
      expect(taken.success).toBe(false)
      if (!taken.success) expect(taken.errorMessage).toContain("vergeben")
      const own = dashOrgProfileUpdate({ orgId: "org-lindenhof", patch: { slug: "kulturhaus-lindenhof" } }, store)
      expect(own.success).toBe(true)
    } finally {
      store.dispose()
    }
  })

  test("meldet eine unbekannte Organisation", () => {
    const store = dashProfileTestStoreCreate()
    try {
      const result = dashOrgProfileUpdate({ orgId: "org-unbekannt", patch: { name: "Neu" } }, store)
      expect(result.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})
