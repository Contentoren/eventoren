import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import { dashStoreCreate, type DashStore } from "../../dashStoreCreate.ts"
import { dashAdminOrgApprove } from "./dashAdminOrgApprove.ts"
import { dashAdminOrgBlock } from "./dashAdminOrgBlock.ts"
import { dashAdminOrgFeeUpdate } from "./dashAdminOrgFeeUpdate.ts"
import { dashAdminOrgTaxUpdate } from "./dashAdminOrgTaxUpdate.ts"
import { dashAdminOrgUnblock } from "./dashAdminOrgUnblock.ts"

function dashAdminTestStoreCreate(): DashStore {
  return dashStoreCreate({
    storage: null,
    now: () => new Date("2026-09-15T12:00:00.000Z"),
    seed: (now) => dashSeedCreate(now),
    schedule: (fn) => fn(),
  })
}

describe("dashAdminOrgApprove", () => {
  test("gibt eine Organisation in Prüfung frei und schreibt ein Audit", () => {
    const store = dashAdminTestStoreCreate()
    try {
      const before = store.state.orgs.find((org) => org.id === "org-studio-balance")
      expect(before?.status).toBe("pruefung")
      const result = dashAdminOrgApprove("org-studio-balance", store)
      expect(result.success).toBe(true)
      const after = store.state.orgs.find((org) => org.id === "org-studio-balance")
      expect(after?.status).toBe("aktiv")
      expect(after?.statusReason).toBe("")
      const audit = store.state.audit.at(-1)
      expect(audit?.area).toBe("admin")
      expect(audit?.orgId).toBe("org-studio-balance")
      expect(audit?.action).toContain("freigegeben")
    } finally {
      store.dispose()
    }
  })

  test("lehnt aktive Organisationen ab", () => {
    const store = dashAdminTestStoreCreate()
    try {
      const result = dashAdminOrgApprove("org-lindenhof", store)
      expect(result.success).toBe(false)
    } finally {
      store.dispose()
    }
  })

  test("lehnt unbekannte Organisationen ab", () => {
    const store = dashAdminTestStoreCreate()
    try {
      const result = dashAdminOrgApprove("org-unbekannt", store)
      expect(result.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashAdminOrgBlock", () => {
  test("sperrt eine aktive Organisation mit Grund und schreibt ein Audit", () => {
    const store = dashAdminTestStoreCreate()
    try {
      const result = dashAdminOrgBlock("org-lindenhof", "Verdacht auf Missbrauch", store)
      expect(result.success).toBe(true)
      const after = store.state.orgs.find((org) => org.id === "org-lindenhof")
      expect(after?.status).toBe("gesperrt")
      expect(after?.statusReason).toBe("Verdacht auf Missbrauch")
      const audit = store.state.audit.at(-1)
      expect(audit?.area).toBe("admin")
      expect(audit?.orgId).toBe("org-lindenhof")
      expect(audit?.action).toContain("gesperrt")
    } finally {
      store.dispose()
    }
  })

  test("verlangt einen Sperrgrund", () => {
    const store = dashAdminTestStoreCreate()
    try {
      const result = dashAdminOrgBlock("org-lindenhof", "   ", store)
      expect(result.success).toBe(false)
      expect(store.state.orgs.find((org) => org.id === "org-lindenhof")?.status).toBe("aktiv")
    } finally {
      store.dispose()
    }
  })

  test("lehnt doppelte Sperrung ab", () => {
    const store = dashAdminTestStoreCreate()
    try {
      expect(dashAdminOrgBlock("org-lindenhof", "Grund", store).success).toBe(true)
      expect(dashAdminOrgBlock("org-lindenhof", "Noch ein Grund", store).success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashAdminOrgUnblock", () => {
  test("entsperrt eine gesperrte Organisation", () => {
    const store = dashAdminTestStoreCreate()
    try {
      expect(dashAdminOrgBlock("org-lindenhof", "Verdacht auf Missbrauch", store).success).toBe(true)
      const result = dashAdminOrgUnblock("org-lindenhof", store)
      expect(result.success).toBe(true)
      const after = store.state.orgs.find((org) => org.id === "org-lindenhof")
      expect(after?.status).toBe("aktiv")
      expect(after?.statusReason).toBe("")
      const audit = store.state.audit.at(-1)
      expect(audit?.area).toBe("admin")
      expect(audit?.action).toContain("entsperrt")
    } finally {
      store.dispose()
    }
  })

  test("lehnt nicht gesperrte Organisationen ab", () => {
    const store = dashAdminTestStoreCreate()
    try {
      expect(dashAdminOrgUnblock("org-lindenhof", store).success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})

describe("dashAdminOrgFeeUpdate", () => {
  test("aktualisiert das Gebührenmodell und schreibt ein Audit", () => {
    const store = dashAdminTestStoreCreate()
    try {
      const result = dashAdminOrgFeeUpdate(
        { orgId: "org-abikur", percentBps: 400, fixedCents: 49, payer: "kaeufer" },
        store,
      )
      expect(result.success).toBe(true)
      const after = store.state.orgs.find((org) => org.id === "org-abikur")
      expect(after?.fee).toEqual({ percentBps: 400, fixedCents: 49, payer: "kaeufer" })
      const audit = store.state.audit.at(-1)
      expect(audit?.area).toBe("admin")
      expect(audit?.action).toContain("Gebührenmodell")
    } finally {
      store.dispose()
    }
  })

  test("lehnt Werte außerhalb der Grenzen ab", () => {
    const store = dashAdminTestStoreCreate()
    try {
      expect(
        dashAdminOrgFeeUpdate({ orgId: "org-abikur", percentBps: 2001, fixedCents: 0, payer: "kaeufer" }, store)
          .success,
      ).toBe(false)
      expect(
        dashAdminOrgFeeUpdate({ orgId: "org-abikur", percentBps: 100, fixedCents: 501, payer: "kaeufer" }, store)
          .success,
      ).toBe(false)
      expect(
        dashAdminOrgFeeUpdate({ orgId: "org-abikur", percentBps: -1, fixedCents: 0, payer: "kaeufer" }, store).success,
      ).toBe(false)
      expect(store.state.orgs.find((org) => org.id === "org-abikur")?.fee.percentBps).toBe(350)
    } finally {
      store.dispose()
    }
  })
})

describe("dashAdminOrgTaxUpdate", () => {
  test("aktualisiert Status und Standardsatz", () => {
    const store = dashAdminTestStoreCreate()
    try {
      const result = dashAdminOrgTaxUpdate({ orgId: "org-abikur", status: "regel", defaultRateBps: 700 }, store)
      expect(result.success).toBe(true)
      const after = store.state.orgs.find((org) => org.id === "org-abikur")
      expect(after?.tax).toEqual({ status: "regel", defaultRateBps: 700 })
      const audit = store.state.audit.at(-1)
      expect(audit?.area).toBe("admin")
    } finally {
      store.dispose()
    }
  })

  test("lehnt ungültige Werte ab", () => {
    const store = dashAdminTestStoreCreate()
    try {
      const invalid = dashAdminOrgTaxUpdate(
        { orgId: "org-abikur", status: "regel", defaultRateBps: 1600 as 700 },
        store,
      )
      expect(invalid.success).toBe(false)
      expect(store.state.orgs.find((org) => org.id === "org-abikur")?.tax.defaultRateBps).toBe(1900)
    } finally {
      store.dispose()
    }
  })
})
