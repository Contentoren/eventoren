import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, mock } from "bun:test"

type CheckoutScenario = {
  emptyCart: boolean
  participantCount: number
  stripeUrl: string
  orderId: string | null
}

let scenario: CheckoutScenario = {
  emptyCart: false,
  participantCount: 1,
  stripeUrl: "https://checkout.stripe.com/c/pay/cs_test_123456",
  orderId: "order-1",
}
const fills: Array<{ selector: string; value: string }> = []
const checks: string[] = []
const waitedUrls: string[] = []
let stripeClicked = 0

function leafLocator(key: string) {
  return {
    __key: key,
    click: async () => {
      if (key === "button:Weiter zur sicheren Zahlung") stripeClicked += 1
    },
    fill: async (value: string) => {
      fills.push({ selector: key, value })
    },
    check: async () => {
      checks.push(key)
    },
    count: async () => {
      if (key.includes("Dein Warenkorb")) return scenario.emptyCart ? 1 : 0
      if (key === 'input[name^="participant-"]') return scenario.participantCount
      return 0
    },
    nth: (index: number) => leafLocator(`${key}#${index}`),
    first: () => leafLocator(key),
    getByRole: (_role: string, _options?: unknown) => leafLocator(key),
  }
}

const pageMock = {
  goto: async () => {},
  waitForURL: async (predicate: (url: URL) => boolean) => {
    waitedUrls.push("waitForURL")
    // The flow navigates event -> /warenkorb -> /checkout. Prove each leg
    // targets its expected path instead of accepting any navigation.
    const matchesWarenkorb = predicate(new URL("https://eventoren.leonardomora.de/warenkorb"))
    const matchesCheckout = predicate(new URL("https://eventoren.leonardomora.de/checkout"))
    if (!matchesWarenkorb && !matchesCheckout)
      throw new Error("Checkout navigation does not target /warenkorb or /checkout")
  },
  url: () => scenario.stripeUrl,
  getByRole: (role: string, options?: { name?: string | RegExp }) =>
    leafLocator(`${role}:${String(options?.name ?? "")}`),
  getByText: (text: string | RegExp) => leafLocator(`text:${String(text)}`),
  locator: (selector: string) => leafLocator(selector),
}

const guestContextMock = {
  newPage: async () => pageMock,
  storageState: async () => ({
    origins: [
      {
        origin: "https://eventoren.leonardomora.de",
        localStorage: scenario.orderId
          ? [{ name: "eventoren.ticketOrderAccess.v1", value: JSON.stringify([{ orderId: scenario.orderId }]) }]
          : [],
      },
    ],
  }),
  close: async () => {},
}

const browserMock = {
  newContext: async () => guestContextMock,
}

function playwrightExpectMock() {
  return {
    toBeVisible: async () => {},
    toHaveAttribute: async () => {},
    toBeEnabled: async () => {},
    toHaveURL: async () => {},
  }
}

mock.module("@rstest/playwright", () => ({ expect: () => playwrightExpectMock() }))

const { ticketPurchaseCheckoutStep } = await import("./ticketPurchaseCheckoutStep.ts")
const { e2eCheckpointSave } = await import("../../checkpoint/e2eCheckpointSave.ts")
const { e2eCheckpointLoad } = await import("../../checkpoint/e2eCheckpointLoad.ts")

const runId = "abc-12345678-1234-1234-1234-123456789abc"
const baseUrl = "https://eventoren.leonardomora.de"
const target = { target: "development" as const, baseUrl: baseUrl as "https://eventoren.leonardomora.de" }

function freshCheckpoint() {
  return {
    version: 1 as const,
    target: "development" as const,
    baseUrl: baseUrl as "https://eventoren.leonardomora.de",
    runId,
    createdAt: 1_000_000,
    phase: "ticket-unreconciled" as const,
    ticket: {
      step: "publication" as const,
      status: "completed" as const,
      eventKey: `ticket-e2e-${runId}`,
      eventTitle: `Ticket E2E ${runId}`,
      participantName: `E2E Participant ${runId}`,
      mailSince: 1_000_000,
      eventId: `ticket-e2e-${runId}`,
      productId: "ticket-1",
    },
  }
}

function contextCreate(directory: string, checkpoint: ReturnType<typeof freshCheckpoint>) {
  return {
    page: {},
    browser: browserMock,
    baseUrl,
    directory,
    checkpoint: checkpoint as never,
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    browserErrors: { observe: () => {} },
  } as never
}

function resetState(next: Partial<CheckoutScenario> = {}) {
  scenario = {
    emptyCart: false,
    participantCount: 1,
    stripeUrl: "https://checkout.stripe.com/c/pay/cs_test_123456",
    orderId: "order-1",
    ...next,
  }
  fills.length = 0
  checks.length = 0
  waitedUrls.length = 0
  stripeClicked = 0
}

describe("ticket checkout browser contracts match the current frontend", () => {
  it("fills the split address fields and both legal acceptances before the Stripe redirect", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-checkout-form-"))
    try {
      resetState()
      const checkpoint = freshCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await ticketPurchaseCheckoutStep(context, { billingReadinessProve: async () => {} })
      const value = (selector: string) => fills.filter((fill) => fill.selector === selector).map((f) => f.value)
      // Single-line combined address is stale: street, postal, city and country are separate required fields.
      expect(value("#checkout-address")).toEqual(["Teststraße 1"])
      expect(value("#checkout-postal-code")).toEqual(["10115"])
      expect(value("#checkout-city")).toEqual(["Berlin"])
      expect(value("#checkout-country")).toEqual(["DE"])
      // Single legal checkbox is stale: terms and privacy are separate required acceptances.
      expect(checks).toContain("#checkout-terms-acceptance")
      expect(checks).toContain("#checkout-privacy-acknowledgement")
      expect(checks).not.toContain("#checkout-legal-acceptance")
      expect(fills.some((fill) => fill.selector === "#checkout-legal-acceptance")).toBe(false)
      // Participant names still use the participant- prefix, one fill per ticket.
      expect(value('input[name^="participant-"]#0')).toEqual([`E2E Participant ${runId}`])
      // Navigation explicitly waits for /checkout before filling.
      expect(waitedUrls.length).toBeGreaterThan(0)
      expect(stripeClicked).toBe(1)
      const loaded = await e2eCheckpointLoad(directory, target)
      if (!loaded.success || !loaded.data?.ticket) throw new Error("Checkpoint ticket missing")
      expect(loaded.data.ticket.step).toBe("checkout")
      expect(loaded.data.ticket.status).toBe("completed")
      expect(loaded.data.ticket.stripeSession).toBe("cs_test_123456")
      expect(loaded.data.ticket.orderId).toBe("order-1")
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retains without an order when checkout renders the empty cart state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-checkout-empty-"))
    try {
      resetState({ emptyCart: true })
      const checkpoint = freshCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await expect(ticketPurchaseCheckoutStep(context, { billingReadinessProve: async () => {} })).rejects.toThrow(
        /empty cart/u,
      )
      // Never advanced to Stripe and never recorded an uncertain order.
      expect(stripeClicked).toBe(0)
      expect(fills.length).toBe(0)
      const loaded = await e2eCheckpointLoad(directory, target)
      if (!loaded.success || !loaded.data?.ticket) throw new Error("Checkpoint ticket missing")
      expect(loaded.data.ticket.step).toBe("checkout")
      expect(loaded.data.ticket.status).toBe("started")
      expect(loaded.data.ticket.orderId).toBeUndefined()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retains when no participant field is rendered instead of submitting blindly", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-checkout-no-participant-"))
    try {
      resetState({ participantCount: 0 })
      const checkpoint = freshCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await expect(ticketPurchaseCheckoutStep(context, { billingReadinessProve: async () => {} })).rejects.toThrow(
        /participant/u,
      )
      expect(stripeClicked).toBe(0)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("creates zero orders on fresh checkout when Billing readiness is not proved", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-checkout-readiness-"))
    try {
      resetState()
      const checkpoint = freshCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      let created = 0
      const countingBrowser = {
        newContext: async () => {
          created += 1
          return guestContextMock
        },
      }
      const context = {
        page: {},
        browser: countingBrowser,
        baseUrl,
        directory,
        checkpoint: checkpoint as never,
        mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
        browserErrors: { observe: () => {} },
      } as never
      await expect(
        ticketPurchaseCheckoutStep(context, {
          billingReadinessProve: async () => {
            throw new Error("Billing publication not ready; checkpoint retained")
          },
        }),
      ).rejects.toThrow(/Billing publication not ready/u)
      expect(created).toBe(0)
      expect(stripeClicked).toBe(0)
      const loaded = await e2eCheckpointLoad(directory, target)
      if (!loaded.success || !loaded.data?.ticket) throw new Error("Checkpoint ticket missing")
      // ticketPurchaseStepRun records checkout/started intent before the
      // read-only readiness gate; the browser/order create never ran.
      expect(loaded.data.ticket.step).toBe("checkout")
      expect(loaded.data.ticket.status).toBe("started")
      expect(loaded.data.ticket.orderId).toBeUndefined()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("resumed publication-skipped checkout creates zero orders when readiness is not proved", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-checkout-resumed-"))
    try {
      resetState()
      const started = {
        ...freshCheckpoint(),
        ticket: { ...freshCheckpoint().ticket, step: "checkout" as const, status: "started" as const },
      }
      expect((await e2eCheckpointSave(directory, started as never)).success).toBe(true)
      let created = 0
      const countingBrowser = {
        newContext: async () => {
          created += 1
          return guestContextMock
        },
      }
      const context = {
        page: {},
        browser: countingBrowser,
        baseUrl,
        directory,
        checkpoint: structuredClone(started) as never,
        mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
        browserErrors: { observe: () => {} },
      } as never
      const stripe = {
        account: async () => ({ success: true as const, data: "acct_test" }),
        list: async () => ({ success: true as const, data: [] }),
        get: async () => ({ success: false as const, errorMessage: "unused" }),
      } as never
      const orderDiscovery = async () => ({
        success: true as const,
        data: { page: [], isDone: true as const, continueCursor: null as string | null },
      })
      await expect(
        ticketPurchaseCheckoutStep(context, {
          environment: {
            E2E_TARGET: "development",
            E2E_BASE_URL: "https://eventoren.leonardomora.de",
            E2E_CLEANUP_CONVEX_URL: "https://eventoren-convex.leonardomora.de",
          },
          stripeKey: "sk_test_123456",
          stripeAccountId: "acct_test",
          stripeOrganizationId: "org_test",
          stripe,
          orderProof: async () => ({ success: false as const, errorMessage: "unused" }),
          orderDiscovery,
          billingReadinessProve: async () => {
            throw new Error("Billing publication not ready; checkpoint retained")
          },
        }),
      ).rejects.toThrow(/Billing publication not ready/u)
      expect(created).toBe(0)
      const loaded = await e2eCheckpointLoad(directory, target)
      if (!loaded.success || !loaded.data?.ticket) throw new Error("Checkpoint ticket missing")
      expect(loaded.data.ticket.step).toBe("checkout")
      expect(loaded.data.ticket.status).toBe("started")
      expect(loaded.data.ticket.orderId).toBeUndefined()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
