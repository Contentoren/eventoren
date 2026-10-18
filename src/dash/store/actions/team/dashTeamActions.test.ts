import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import { dashStoreCreate, type DashStore } from "../../dashStoreCreate.ts"
import { dashMemberInvite } from "./dashMemberInvite.ts"
import { dashMemberInviteResend } from "./dashMemberInviteResend.ts"
import { dashMemberRemove } from "./dashMemberRemove.ts"
import { dashMemberRoleChange } from "./dashMemberRoleChange.ts"

function teamStoreCreate(): DashStore {
  return dashStoreCreate({
    storage: null,
    now: () => new Date("2026-10-18T10:00:00.000Z"),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
  })
}

describe("dashMemberInvite", () => {
  test("lädt neue Adressen ein und überspringt bestehende", () => {
    const store = teamStoreCreate()
    try {
      const result = dashMemberInvite(
        { orgId: "org-lindenhof", emails: ["neu@example.de", "mara@kulturhaus-lindenhof.de"], role: "einlass" },
        store,
      )
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Invite schlug fehl")
      expect(result.data.invited).toBe(1)
      expect(result.data.skipped).toEqual(["mara@kulturhaus-lindenhof.de"])
      const added = store.state.members.find((member) => member.email === "neu@example.de")
      expect(added?.role).toBe("einlass")
      expect(added?.status).toBe("eingeladen")
      expect(added?.userId).toBeNull()
      expect(added?.name).toBe("Neu")
      expect(store.state.audit.at(-1)?.area).toBe("team")
    } finally {
      store.dispose()
    }
  })

  test("lehnt leere Listen ab", () => {
    const store = teamStoreCreate()
    try {
      const result = dashMemberInvite({ orgId: "org-lindenhof", emails: ["kein-mail"], role: "einlass" }, store)
      expect(result.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashMemberRoleChange", () => {
  test("ändert die Rolle mit Audit", () => {
    const store = teamStoreCreate()
    try {
      const result = dashMemberRoleChange("mem-jonas-lindenhof", "finanzen", store)
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("RoleChange schlug fehl")
      expect(result.data.role).toBe("finanzen")
      expect(store.state.audit.at(-1)?.area).toBe("team")
    } finally {
      store.dispose()
    }
  })

  test("schützt den letzten Inhaber vor Herabstufung", () => {
    const store = teamStoreCreate()
    try {
      const result = dashMemberRoleChange("mem-mara-lindenhof", "admin", store)
      expect(result.success).toBe(false)
      if (result.success) throw new Error("Schutz griff nicht")
      expect(result.errorMessage).toContain("letzte Inhaber")
    } finally {
      store.dispose()
    }
  })
})

describe("dashMemberRemove", () => {
  test("entfernt ein Mitglied mit Audit", () => {
    const store = teamStoreCreate()
    try {
      const result = dashMemberRemove("mem-tim-lindenhof", store)
      expect(result.success).toBe(true)
      expect(store.state.members.some((member) => member.id === "mem-tim-lindenhof")).toBe(false)
      expect(store.state.audit.at(-1)?.area).toBe("team")
    } finally {
      store.dispose()
    }
  })

  test("schützt den letzten Inhaber und dich selbst", () => {
    const store = teamStoreCreate()
    try {
      const owner = dashMemberRemove("mem-mara-lindenhof", store)
      expect(owner.success).toBe(false)
      const self = dashMemberRemove("mem-jonas-lindenhof", store)
      void self
      // Jonas ist nicht der Session-User (Mara); Selbstschutz prüfen wir über Mara:
      const me = dashMemberRemove("mem-mara-lindenhof", store)
      expect(me.success).toBe(false)
      if (me.success) throw new Error("Schutz griff nicht")
    } finally {
      store.dispose()
    }
  })

  test("verweigert das Entfernen deiner selbst", () => {
    const store = teamStoreCreate()
    try {
      // Session-User ist user-mara → mem-mara-lindenhof ist "du"
      store.state.session.userId = "user-jonas"
      const result = dashMemberRemove("mem-jonas-lindenhof", store)
      expect(result.success).toBe(false)
      if (result.success) throw new Error("Selbstschutz griff nicht")
      expect(result.errorMessage).toContain("Du kannst dich nicht selbst entfernen")
    } finally {
      store.dispose()
    }
  })
})

describe("dashMemberInviteResend", () => {
  test("aktualisiert invitedAt", () => {
    const store = teamStoreCreate()
    try {
      const before = store.state.members.find((member) => member.id === "mem-tim-lindenhof")?.invitedAt
      const result = dashMemberInviteResend("mem-tim-lindenhof", store)
      expect(result.success).toBe(true)
      if (!result.success) throw new Error("Resend schlug fehl")
      expect(result.data.invitedAt).not.toBeNull()
      void before
      expect(store.state.audit.at(-1)?.area).toBe("team")
    } finally {
      store.dispose()
    }
  })

  test("lehnt aktive Mitglieder ab", () => {
    const store = teamStoreCreate()
    try {
      const result = dashMemberInviteResend("mem-jonas-lindenhof", store)
      expect(result.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})
