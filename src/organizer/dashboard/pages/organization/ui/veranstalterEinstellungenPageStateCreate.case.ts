import { expect, mock, test } from "bun:test"
import type { ConvexClient } from "convex/browser"
import { getFunctionName } from "convex/server"
import { createResult, createResultError } from "#result"

const solidJsClientPath = "solid-js/dist/solid.js"
type SolidJsModule = typeof import("solid-js")
const solidJsClient = (await import(solidJsClientPath)) as unknown as SolidJsModule
mock.module("solid-js", () => solidJsClient)
const { createComponent, createRoot } = solidJsClient
const { createSignalObject } = await import("#ui/utils/createSignalObject.js")
const { api } = await import("#convex/_generated/api.js")
const { eventorenAuthContext } = await import("#src/auth/ui/eventorenAuthContext.ts")
const { convexClientContext } = await import("#src/utils/convex_client/convexClientContext.ts")
const { veranstalterEinstellungenPageStateCreate } = await import("./veranstalterEinstellungenPageStateCreate.ts")
mock.restore()

function profileCreate(orgId: string, canAcceptContracts = true) {
  return createResult({
    orgId,
    status: "active",
    configurationConfirmed: true,
    canAcceptContracts,
    profile: {
      name: `Organisation ${orgId}`,
      slug: orgId,
      kind: "unternehmen",
      contact: { email: `${orgId}@example.org`, phone: `Telefon ${orgId}` },
      imprint: `Impressum ${orgId}`,
    },
    bank: { iban: orgId === "A" ? "DE89370400440532013000" : "DE02120300000000202051", holder: `Bank ${orgId}` },
    fee: null,
    tax: null,
    contracts: { termsAccepted: false, dpaAccepted: false, current: false },
  })
}

function contractConsentFill(state: ReturnType<typeof veranstalterEinstellungenPageStateCreate>) {
  state.contractParty.set({
    legalName: "Testorganisation GmbH",
    representativeName: "Ada Beispiel",
    streetAddress: "Teststraße 1",
    postalCode: "10115",
    city: "Berlin",
    countryCode: "DE",
    email: "contracts@example.org",
    customerType: "business",
  })
  state.customerType.set("business")
  // Party changes invalidate consent, so fill the acknowledgements last.
  state.termsAccepted.set(true)
  state.dpaAccepted.set(true)
  state.authorityConfirmed.set(true)
}

type MutationCall = { reference: unknown; args: Record<string, unknown> }
type Subscription = { args: Record<string, unknown>; push: (value: unknown) => void; active: boolean }

function harnessCreate() {
  const calls: MutationCall[] = []
  const subscriptions: Subscription[] = []
  const orgId = createSignalObject<string | undefined>("A")
  const permissions = createSignalObject<readonly string[]>(["profil.bearbeiten", "bank.bearbeiten"])
  let mutationResponse: (() => Promise<unknown>) | undefined
  const client = {
    mutation: async (reference: unknown, args: Record<string, unknown>) => {
      calls.push({ reference, args })
      return mutationResponse ? mutationResponse() : createResult({ orgId: args.orgId })
    },
    onUpdate: (
      _query: unknown,
      args: Record<string, unknown>,
      onUpdate: (value: unknown) => void,
      _onError: (error: Error) => void,
    ) => {
      const subscription = { args, push: onUpdate, active: true }
      subscriptions.push(subscription)
      return () => {
        subscription.active = false
      }
    },
  } as unknown as ConvexClient
  let captured: ReturnType<typeof veranstalterEinstellungenPageStateCreate> | undefined
  const dispose = createRoot((disposeRoot) => {
    createComponent(convexClientContext.Provider, {
      value: client,
      get children() {
        return createComponent(eventorenAuthContext.Provider, {
          value: { ...eventorenAuthContext.defaultValue, token: () => "validated-token", ready: () => true },
          get children() {
            captured = veranstalterEinstellungenPageStateCreate({
              orgId: orgId.get,
              permissions: permissions.get,
            })
            return undefined
          },
        })
      },
    })
    return disposeRoot
  })
  if (!captured) throw new Error("settings state was not captured inside the providers")
  const push = (subscriptionOrgId: string, result: unknown = profileCreate(subscriptionOrgId)) => {
    const subscription = subscriptions.findLast((entry) => entry.active && entry.args.orgId === subscriptionOrgId)
    if (!subscription) throw new Error(`No subscription for ${subscriptionOrgId}`)
    subscription.push(result)
  }
  return {
    state: captured,
    orgId,
    permissions,
    calls,
    push,
    dispose,
    deferMutation: (response: () => Promise<unknown>) => {
      mutationResponse = response
    },
  }
}

test("switching A to B immediately clears all organization fields, flags and consents, including undefined selection", () => {
  const h = harnessCreate()
  try {
    h.push("A")
    expect(h.state.name.get()).toBe("Organisation A")
    expect(h.state.bankHolder.get()).toBe("Bank A")
    h.state.saved.set(true)
    h.state.serverError.set("old error")
    contractConsentFill(h.state)
    h.orgId.set("B")
    expect(h.state.name.get()).toBe("")
    for (const field of [h.state.contactEmail, h.state.contactPhone, h.state.imprint, h.state.iban, h.state.bankHolder])
      expect(field.get()).toBe("")
    expect(h.state.kind.get()).toBe("verein")
    expect(h.state.saved.get()).toBe(false)
    expect(h.state.serverError.get()).toBeNull()
    expect(h.state.termsAccepted.get()).toBe(false)
    expect(h.state.dpaAccepted.get()).toBe(false)
    expect(h.state.authorityConfirmed.get()).toBe(false)
    expect(h.state.contractParty.get().legalName).toBe("")
    expect(h.state.canSubmit()).toBe(false)
    expect(h.state.storedProfile()).toBeNull()
    h.push("B")
    h.orgId.set(undefined)
    expect(h.state.name.get()).toBe("")
    expect(h.state.storedProfile()).toBeNull()
    expect(h.state.canSubmit()).toBe(false)
  } finally {
    h.dispose()
  }
})

test("direct submit rejects a mismatched loaded profile even with otherwise valid form inputs", async () => {
  const h = harnessCreate()
  try {
    h.push("A")
    h.orgId.set("B")
    h.push("B", profileCreate("A"))
    h.state.name.set("Valid form")
    expect(h.state.canSubmit()).toBe(false)
    await h.state.submit()
    expect(h.calls).toHaveLength(0)
    expect(h.state.serverError.get()).toMatch(/Organisation.*geladen/)
    expect(h.state.storedProfile()).toBeNull()
  } finally {
    h.dispose()
  }
})

test("loading B prefills B and updates only B's profile and bank values", async () => {
  const h = harnessCreate()
  try {
    h.push("A")
    h.orgId.set("B")
    h.push("B")
    expect(h.state.name.get()).toBe("Organisation B")
    expect(h.state.iban.get()).toBe(profileCreate("B").data.bank.iban)
    expect(h.state.canSubmit()).toBe(true)
    await h.state.submit()
    expect(h.calls).toHaveLength(1)
    expect(getFunctionName(h.calls[0]?.reference as never)).toBe(
      getFunctionName(api.organizerDashboard.organizerDashboardOrganizationUpdateMutation),
    )
    expect(h.calls[0]?.args).toEqual({
      orgId: "B",
      token: "validated-token",
      name: "Organisation B",
      kind: "unternehmen",
      contactEmail: "B@example.org",
      contactPhone: "Telefon B",
      imprint: "Impressum B",
      iban: "DE02120300000000202051",
      bankHolder: "Bank B",
    })
  } finally {
    h.dispose()
  }
})

test("contract acceptance requires a matching loaded organization and that organization's acceptance permission", async () => {
  const h = harnessCreate()
  try {
    h.push("A")
    h.orgId.set("B")
    h.push("B", profileCreate("A"))
    contractConsentFill(h.state)
    await h.state.submitContracts()
    expect(h.calls).toHaveLength(0)
    expect(h.state.serverError.get()).toMatch(/Organisation.*geladen/)
    h.push("B", profileCreate("B", false))
    contractConsentFill(h.state)
    await h.state.submitContracts()
    expect(h.calls).toHaveLength(0)
    h.push("B")
    await h.state.submitContracts()
    expect(h.calls).toHaveLength(1)
    expect(getFunctionName(h.calls[0]?.reference as never)).toBe(
      getFunctionName(api.organizerDashboard.organizerContractsAcceptMutation),
    )
    expect(h.calls[0]?.args.orgId).toBe("B")
    expect(h.calls[0]?.args.contractParty).toEqual(h.state.contractParty.get())
    expect(h.calls[0]?.args.authorityConfirmed).toBe(true)
  } finally {
    h.dispose()
  }
})

test("a same-organization live update preserves unsaved user edits", () => {
  const h = harnessCreate()
  try {
    h.push("A")
    h.state.name.set("My unsaved name")
    h.state.iban.set("DE02120300000000202051")
    h.state.bankHolder.set("My unsaved bank")
    const updated = profileCreate("A")
    updated.data.profile.name = "New server name"
    h.push("A", updated)
    expect(h.state.name.get()).toBe("My unsaved name")
    expect(h.state.iban.get()).toBe("DE02120300000000202051")
    expect(h.state.bankHolder.get()).toBe("My unsaved bank")
  } finally {
    h.dispose()
  }
})

test("contract dates guard invalid timestamps and format valid UTC instants explicitly in Berlin", () => {
  const h = harnessCreate()
  try {
    expect(h.state.contractDateLabel("not-a-date")).toBe("Ungültiger Zeitstempel")
    expect(h.state.contractDateLabel("2026-07-01T12:00:00.000Z")).toBe("01.07.2026, 14:00 (Europe/Berlin)")
    expect(h.state.contractDateLabel(undefined)).toBe("Keine revisionierte Zustimmung erfasst")
    expect(h.state.contractDateLabel("")).toBe("Keine revisionierte Zustimmung erfasst")
  } finally {
    h.dispose()
  }
})

test("an in-flight profile mutation never displays success or failure in the newly selected organization", async () => {
  const h = harnessCreate()
  try {
    for (const response of [createResult({ orgId: "A" }), createResultError("test", "old failure")]) {
      h.orgId.set("A")
      h.push("A")
      let finish: ((value: unknown) => void) | undefined
      h.deferMutation(
        () =>
          new Promise((resolve) => {
            finish = resolve
          }),
      )
      const pending = h.state.submit()
      expect(h.calls.at(-1)?.args.orgId).toBe("A")
      h.orgId.set("B")
      h.push("B")
      if (!finish) throw new Error("Profile mutation did not start")
      finish(response)
      await pending
      expect(h.state.saved.get()).toBe(false)
      expect(h.state.serverError.get()).toBeNull()
    }
  } finally {
    h.dispose()
  }
})

test("an in-flight consent mutation never clears the new organization's consents or shows an old error", async () => {
  const h = harnessCreate()
  try {
    for (const response of [createResult({ orgId: "A" }), createResultError("test", "old failure")]) {
      h.orgId.set("A")
      h.push("A")
      contractConsentFill(h.state)
      let finish: ((value: unknown) => void) | undefined
      h.deferMutation(
        () =>
          new Promise((resolve) => {
            finish = resolve
          }),
      )
      const pending = h.state.submitContracts()
      expect(h.calls.at(-1)?.args.orgId).toBe("A")
      h.orgId.set("B")
      h.push("B")
      contractConsentFill(h.state)
      if (!finish) throw new Error("Consent mutation did not start")
      finish(response)
      await pending
      expect(h.state.termsAccepted.get()).toBe(true)
      expect(h.state.dpaAccepted.get()).toBe(true)
      expect(h.state.serverError.get()).toBeNull()
    }
  } finally {
    h.dispose()
  }
})

for (const request of ["profile", "consent"] as const) {
  for (const outcome of ["success", "failure"] as const) {
    test(`${request} old ${outcome} cannot affect new A edits after A -> B -> A`, async () => {
      const h = harnessCreate()
      try {
        h.push("A")
        contractConsentFill(h.state)
        let finish!: (value: unknown) => void
        h.deferMutation(
          () =>
            new Promise((resolve) => {
              finish = resolve
            }),
        )
        const oldRequest = request === "profile" ? h.state.submit() : h.state.submitContracts()
        h.orgId.set("B")
        h.orgId.set("A")
        h.push("A")
        h.state.name.set("New unsaved A")
        contractConsentFill(h.state)
        finish(outcome === "success" ? createResult({ orgId: "A" }) : createResultError("test", "old A failure"))
        await oldRequest
        expect(h.state.saved.get()).toBe(false)
        expect(h.state.serverError.get()).toBeNull()
        expect(h.state.name.get()).toBe("New unsaved A")
        expect(h.state.termsAccepted.get()).toBe(true)
        expect(h.state.dpaAccepted.get()).toBe(true)
      } finally {
        h.dispose()
      }
    })
    test(`${request} ignores old ${outcome} after A -> B -> A, including newer pending cleanup`, async () => {
      const h = harnessCreate()
      try {
        h.push("A")
        contractConsentFill(h.state)
        const completions: ((value: unknown) => void)[] = []
        h.deferMutation(() => new Promise((resolve) => completions.push(resolve)))
        const submit = request === "profile" ? h.state.submit : h.state.submitContracts
        const pending = request === "profile" ? h.state.submitting : h.state.contractsSubmitting
        const oldRequest = submit()
        expect(pending.get()).toBe(true)
        h.orgId.set("B")
        expect(pending.get()).toBe(false)
        h.push("B")
        h.orgId.set("A")
        h.push("A")
        h.state.name.set("New A unsaved name")
        contractConsentFill(h.state)
        const newRequest = submit()
        expect(completions).toHaveLength(2)
        completions[0]!(
          outcome === "success" ? createResult({ orgId: "A" }) : createResultError("test", "old A failure"),
        )
        await oldRequest
        expect(pending.get()).toBe(true)
        expect(h.state.saved.get()).toBe(false)
        expect(h.state.serverError.get()).toBeNull()
        expect(h.state.name.get()).toBe("New A unsaved name")
        expect(h.state.termsAccepted.get()).toBe(true)
        expect(h.state.dpaAccepted.get()).toBe(true)
        completions[1]!(createResult({ orgId: "A" }))
        await newRequest
        expect(pending.get()).toBe(false)
        if (request === "profile") expect(h.state.saved.get()).toBe(true)
        else expect(h.state.termsAccepted.get()).toBe(false)
      } finally {
        h.dispose()
      }
    })
  }
}

test("reactive bank redaction clears even dirty bank drafts without clearing same-org profile edits", () => {
  const h = harnessCreate()
  try {
    h.push("A")
    h.state.iban.set("DE02120300000000202051")
    h.state.bankHolder.set("Unsaved bank")
    h.state.name.set("Unsaved profile")
    h.permissions.set(["profil.bearbeiten"])
    expect(h.state.canViewBank()).toBe(false)
    expect(h.state.iban.get()).toBe("")
    h.push("A", createResult({ ...profileCreate("A").data, bank: null }))
    expect(h.state.iban.get()).toBe("")
    expect(h.state.bankHolder.get()).toBe("")
    expect(h.state.name.get()).toBe("Unsaved profile")
    expect(h.state.canViewBank()).toBe(false)
  } finally {
    h.dispose()
  }
})

test("an editor's first bank draft survives same-org live refreshes while no stored bank exists", () => {
  const h = harnessCreate()
  try {
    const noBank = () => createResult({ ...profileCreate("A").data, bank: null })
    h.push("A", noBank())
    h.state.iban.set("DE89370400440532013000")
    h.state.bankHolder.set("New bank draft")
    h.push("A", noBank())
    expect(h.state.iban.get()).toBe("DE89370400440532013000")
    expect(h.state.bankHolder.get()).toBe("New bank draft")
    expect(h.state.canEditBank()).toBe(true)
  } finally {
    h.dispose()
  }
})

test("finance permission keeps an authoritative bank visible read-only and query redaction still hides it", () => {
  const h = harnessCreate()
  try {
    h.push("A")
    h.permissions.set(["finanzen.sehen"])
    h.push("A")
    expect(h.state.canEditBank()).toBe(false)
    expect(h.state.canViewBank()).toBe(true)
    expect(h.state.bankHolder.get()).toBe("Bank A")
    h.push("A", createResult({ ...profileCreate("A").data, bank: null }))
    expect(h.state.canViewBank()).toBe(false)
    expect(h.state.iban.get()).toBe("")
    expect(h.state.bankHolder.get()).toBe("")
  } finally {
    h.dispose()
  }
})
