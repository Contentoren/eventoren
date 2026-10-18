import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import { dashStoreCreate } from "../../dashStoreCreate.ts"
import { dashOnboardingComplete } from "./dashOnboardingComplete.ts"

const fixedNow = new Date("2026-10-18T10:00:00.000Z")

function validInput() {
  return {
    account: { name: "Ruth Rhythmus", email: "ruth@tanzschule-rhythmus.de" },
    org: { kind: "unternehmen" as const, name: "Tanzschule Rhythmus", slug: "tanzschule-rhythmus", logoDataUrl: null },
    imprint: {
      legalName: "Tanzschule Rhythmus GmbH",
      street: "Tanzweg 1",
      zip: "04109",
      city: "Leipzig",
      representative: "Ruth Rhythmus (Geschäftsführerin)",
      register: "HRB 4711, Amtsgericht Leipzig",
      vatId: "",
    },
    tax: { status: "klein" as const },
    bank: { holder: "Tanzschule Rhythmus GmbH", iban: "DE89370400440532013000" },
    termsAccepted: true as const,
    dpaAccepted: true as const,
  }
}

describe("dashOnboardingComplete", () => {
  test("legt Org mit Defaults an, wechselt die Session und schreibt Audit (einstellungen)", () => {
    const store = dashStoreCreate({ storage: null, now: () => fixedNow, seed: (now) => dashSeedCreate(now) })
    try {
      const before = store.state.orgs.length
      const result = dashOnboardingComplete(validInput(), store)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(store.state.orgs).toHaveLength(before + 1)
      const org = store.state.orgs.find((candidate) => candidate.id === result.data.orgId)
      expect(org).toBeDefined()
      expect(org?.id).toMatch(/^org-[a-z0-9]{8}$/)
      expect(org?.slug).toBe("tanzschule-rhythmus")
      expect(org?.status).toBe("pruefung")
      expect(org?.statusReason).toBe("")
      expect(org?.tax).toEqual({ status: "klein", defaultRateBps: 1900 })
      expect(org?.fee).toEqual({ percentBps: 500, fixedCents: 49, payer: "kaeufer" })
      expect(org?.voucherDefaultValidity).toBe("3-jahre-jahresende")
      expect(org?.email).toBe("ruth@tanzschule-rhythmus.de")
      expect(org?.termsAcceptedAt).not.toBeNull()
      expect(org?.dpaAcceptedAt).not.toBeNull()
      expect(store.state.session.activeOrgId).toBe(result.data.orgId)
      expect(store.state.session.simulatedRole).toBeNull()
      const membership = store.state.members.find(
        (candidate) => candidate.orgId === result.data.orgId && candidate.userId === store.state.session.userId,
      )
      expect(membership).toMatchObject({ role: "inhaber", status: "aktiv" })
      expect(store.state.users.find((user) => user.id === store.state.session.userId)).toMatchObject({
        name: "Ruth Rhythmus",
        email: "ruth@tanzschule-rhythmus.de",
      })
      expect(
        store.state.audit.some((entry) => entry.area === "einstellungen" && entry.orgId === result.data.orgId),
      ).toBe(true)
    } finally {
      store.dispose()
    }
  })

  test("hängt bei belegtem Slug -2 an statt abzulehnen", () => {
    const store = dashStoreCreate({ storage: null, now: () => fixedNow, seed: (now) => dashSeedCreate(now) })
    try {
      const input = { ...validInput(), org: { ...validInput().org, slug: "kulturhaus-lindenhof" } }
      const first = dashOnboardingComplete(input, store)
      expect(first.success).toBe(true)
      if (!first.success) return
      expect(store.state.orgs.find((org) => org.id === first.data.orgId)?.slug).toBe("kulturhaus-lindenhof-2")
      const second = dashOnboardingComplete(input, store)
      expect(second.success).toBe(true)
      if (!second.success) return
      expect(store.state.orgs.find((org) => org.id === second.data.orgId)?.slug).toBe("kulturhaus-lindenhof-3")
    } finally {
      store.dispose()
    }
  })

  test("ohne account bleibt der Session-Nutzer unverändert", () => {
    const store = dashStoreCreate({ storage: null, now: () => fixedNow, seed: (now) => dashSeedCreate(now) })
    try {
      const userId = store.state.session.userId
      const before = store.state.users.find((user) => user.id === userId)
      expect(before).toBeDefined()
      const result = dashOnboardingComplete({ ...validInput(), account: null }, store)
      expect(result.success).toBe(true)
      expect(store.state.users.find((user) => user.id === userId)).toEqual(before)
    } finally {
      store.dispose()
    }
  })

  test("lehnt falsche IBAN und leere Pflichtfelder ab", () => {
    const store = dashStoreCreate({ storage: null, now: () => fixedNow, seed: (now) => dashSeedCreate(now) })
    try {
      const iban = dashOnboardingComplete(
        {
          ...validInput(),
          org: { ...validInput().org, slug: "tanz-iban-fehler" },
          bank: { holder: "X", iban: "DE00" },
        },
        store,
      )
      expect(iban.success).toBe(false)
      const empty = dashOnboardingComplete(
        { ...validInput(), org: { ...validInput().org, slug: "tanz-leer", name: "  " } },
        store,
      )
      expect(empty.success).toBe(false)
    } finally {
      store.dispose()
    }
  })
})
