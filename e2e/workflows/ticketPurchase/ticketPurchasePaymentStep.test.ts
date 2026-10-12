import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, rs } from "@rstest/core"
import { e2eCheckpointSave } from "../../checkpoint/e2eCheckpointSave.ts"
import { e2eStripeTestClientCreate } from "../../stripe/e2eStripeTestClientCreate.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseCardMethodSelect } from "./ticketPurchaseCardMethodSelect.ts"
import { ticketPurchasePaymentStep } from "./ticketPurchasePaymentStep.ts"

// Helper contracts only: model the normal UI assertions without a browser.
rs.mock("@rstest/playwright", () => ({
  expect: () => ({
    toBeVisible: async () => {},
    toHaveURL: async () => {},
  }),
}))

const runId = "abc-12345678-1234-1234-1234-123456789abc"

function checkpointBase(step: string, status: string, extra: Record<string, unknown> = {}) {
  return {
    version: 1 as const,
    target: "development" as const,
    baseUrl: "https://eventoren.leonardomora.de" as const,
    runId,
    createdAt: 1_000_000,
    phase: "ticket-unreconciled" as const,
    ticket: {
      step,
      status,
      eventKey: `ticket-e2e-${runId}`,
      eventTitle: `Ticket E2E ${runId}`,
      participantName: `E2E Participant ${runId}`,
      mailSince: 1_000_000,
      stripeSession: "cs_test_123456789",
      orderId: "order-1",
      ...extra,
    },
  }
}

function locatorFake(options: { count: number; visible?: boolean; click?: () => void; check?: () => void }) {
  return {
    count: async () => options.count,
    first: () => ({
      isVisible: async () => options.visible ?? true,
      click: async () => options.click?.(),
      check: async () => options.check?.(),
    }),
  }
}

describe("ticket purchase card method selection proves card fields on the actual TEST form", () => {
  it("clicks the visible card accordion header when no Karte radio exists and never submits", async () => {
    let headerClicks = 0
    let radioTouched = false
    const page = {
      getByRole: () => locatorFake({ count: 0, check: () => (radioTouched = true) }),
      getByTestId: (id: string) => {
        if (id !== "card-accordion-item") return locatorFake({ count: 0 })
        return { locator: () => locatorFake({ count: 1, click: () => (headerClicks += 1) }) }
      },
      getByLabel: () => locatorFake({ count: 0 }),
    }
    await ticketPurchaseCardMethodSelect(page as never)
    expect(headerClicks).toBe(1)
    expect(radioTouched).toBe(false)
  })

  it("keeps the legacy Karte radio path without touching the accordion header", async () => {
    let radioChecks = 0
    let headerTouched = false
    const page = {
      getByRole: () => locatorFake({ count: 1, check: () => (radioChecks += 1) }),
      getByTestId: () => ({ locator: () => locatorFake({ count: 1, click: () => (headerTouched = true) }) }),
      getByLabel: () => locatorFake({ count: 0 }),
    }
    await ticketPurchaseCardMethodSelect(page as never)
    expect(radioChecks).toBe(1)
    expect(headerTouched).toBe(false)
  })

  it("skips the method click on a card-only form where card fields are already present", async () => {
    let headerClicks = 0
    const page = {
      getByRole: () => locatorFake({ count: 0 }),
      getByTestId: () => ({ locator: () => locatorFake({ count: 1, click: () => (headerClicks += 1) }) }),
      getByLabel: () => locatorFake({ count: 1 }),
    }
    await ticketPurchaseCardMethodSelect(page as never)
    expect(headerClicks).toBe(0)
  })

  it("retains the payment-started checkpoint instead of replaying an uncertain payment effect", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-payment-test-"))
    try {
      let pageTouched = false
      const context = {
        directory,
        checkpoint: checkpointBase("payment", "started"),
        checkoutPage: new Proxy(
          {},
          {
            get: () => () => {
              pageTouched = true
              throw new Error("payment page must not be touched")
            },
          },
        ),
      } as unknown as TicketPurchaseContext
      expect((await e2eCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      await expect(ticketPurchasePaymentStep(context)).rejects.toThrow("uncertain external effect")
      expect(pageTouched).toBe(false)
      expect(context.checkpoint.ticket).toMatchObject({ step: "payment", status: "started" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retains checkout evidence when the hosted session is no longer open instead of creating a new session", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-payment-test-"))
    try {
      const context = {
        directory,
        checkpoint: checkpointBase("checkout", "completed"),
        browser: { newContext: () => Promise.reject(new Error("second checkout")) },
      } as unknown as TicketPurchaseContext
      expect((await e2eCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      await expect(ticketPurchasePaymentStep(context)).rejects.toThrow("hosted session is no longer open")
      expect(context.checkpoint.ticket).toMatchObject({ step: "checkout", status: "completed" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("refuses card entry when the browser URL is not the exact saved TEST session", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-payment-test-"))
    try {
      const context = {
        directory,
        checkpoint: checkpointBase("checkout", "completed"),
        checkoutPage: { url: () => "https://checkout.stripe.com/c/pay/cs_test_foreign" },
      } as unknown as TicketPurchaseContext
      expect((await e2eCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      await expect(ticketPurchasePaymentStep(context)).rejects.toThrow("Exact test checkout session")
      expect(context.checkpoint.ticket).toMatchObject({ step: "payment", status: "started" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("waits for the delayed card accordion mount and selects without submitting", async () => {
    let headerClicks = 0
    let submitTouched = false
    let polls = 0
    const page = {
      getByRole: () => locatorFake({ count: 0 }),
      getByTestId: (id: string) => {
        if (id !== "card-accordion-item") return locatorFake({ count: 0 })
        return {
          locator: () => ({
            count: async () => {
              polls += 1
              return polls >= 3 ? 1 : 0
            },
            first: () => ({
              isVisible: async () => polls >= 3,
              click: async () => {
                headerClicks += 1
              },
            }),
          }),
        }
      },
      getByLabel: () => locatorFake({ count: 0 }),
      getByText: () => ({ click: async () => (submitTouched = true) }),
    }
    await ticketPurchaseCardMethodSelect(page as never)
    expect(headerClicks).toBe(1)
    expect(polls).toBeGreaterThanOrEqual(3)
    expect(submitTouched).toBe(false)
  })

  it("waits for delayed card fields and proceeds without a method click", async () => {
    let labelPolls = 0
    const page = {
      getByRole: () => locatorFake({ count: 0 }),
      getByTestId: () => ({ locator: () => locatorFake({ count: 0 }) }),
      getByLabel: () => ({
        first: () => ({ isVisible: async () => labelPolls >= 4 }),
        count: async () => {
          labelPolls += 1
          return labelPolls >= 4 ? 1 : 0
        },
      }),
    }
    await ticketPurchaseCardMethodSelect(page as never)
    expect(labelPolls).toBeGreaterThanOrEqual(4)
  })

  it("never clicks hidden, missing-visibility or throwing-visibility accordion headers", async () => {
    for (const visibility of [
      async () => false,
      undefined,
      async () => {
        throw new Error("locator unavailable")
      },
    ]) {
      let clicks = 0
      const now = rs.spyOn(Date, "now")
      let clock = 0
      now.mockImplementation(() => {
        clock += 11_000
        return clock
      })
      try {
        const page = {
          getByRole: () => locatorFake({ count: 0 }),
          getByLabel: () => locatorFake({ count: 0 }),
          getByTestId: () => ({
            locator: () => ({
              count: async () => 1,
              first: () => ({
                isVisible: visibility,
                click: async () => {
                  clicks += 1
                },
              }),
            }),
          }),
        }
        await expect(ticketPurchaseCardMethodSelect(page as never)).rejects.toThrow("did not mount")
        expect(clicks).toBe(0)
      } finally {
        now.mockRestore()
      }
    }
  })

  it("does not accept hidden card fields as a card-only form", async () => {
    const now = rs.spyOn(Date, "now")
    let clock = 0
    now.mockImplementation(() => {
      clock += 11_000
      return clock
    })
    try {
      const page = {
        getByRole: () => locatorFake({ count: 0 }),
        getByLabel: () => locatorFake({ count: 1, visible: false }),
        getByTestId: () => ({ locator: () => locatorFake({ count: 0 }) }),
      }
      await expect(ticketPurchaseCardMethodSelect(page as never)).rejects.toThrow("did not mount")
    } finally {
      now.mockRestore()
    }
  })

  it("UI Bezahlt without canonical paid proof retains the same payment-started receipt", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-paid-proof-test-"))
    try {
      let submits = 0
      const field = {
        ...locatorFake({ count: 1 }),
        isVisible: async () => true,
        fill: async () => {},
        click: async () => {},
      }
      const context = {
        directory,
        checkpoint: checkpointBase("checkout", "completed"),
        checkoutPage: {
          url: () => "https://checkout.stripe.com/c/pay/cs_test_123456789#saved",
          getByRole: () => field,
          getByLabel: () => field,
          getByText: () => field,
          locator: () => field,
          getByTestId: () => ({
            click: async () => {
              submits += 1
            },
          }),
        },
      } as unknown as TicketPurchaseContext
      expect((await e2eCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      const metadata = {
        source: "eventoren_ticket",
        event_key: `ticket-e2e-${runId}`,
        organization_id: "org_test",
        stripe_mode: "test",
        payment_reference: "payment_123",
        order_reference: "order_123",
      }
      const calls: string[] = []
      const stripe = e2eStripeTestClientCreate("sk_test_dummy", (async (
        url: string | URL | Request,
        init?: RequestInit,
      ) => {
        const path = new URL(String(url)).pathname
        calls.push(`${init?.method} ${path}`)
        if (path.endsWith("/account")) return Response.json({ id: "acct_test" })
        if (path.includes("/checkout/sessions/"))
          return Response.json({
            id: "cs_test_123456789",
            livemode: false,
            mode: "payment",
            status: "open",
            payment_status: "unpaid",
            customer: "cus_123",
            subscription: null,
            url: "https://checkout.stripe.com/c/pay/cs_test_123456789#saved",
            payment_intent: null,
            metadata,
          })
        if (path.includes("/customers/")) return Response.json({ id: "cus_123", livemode: false, metadata })
        return Response.json({ data: [], has_more: false })
      }) as typeof fetch)
      await expect(
        ticketPurchasePaymentStep(context, {
          environment: {
            E2E_TARGET: "development",
            E2E_CLEANUP_CONVEX_URL: "https://eventoren-convex.leonardomora.de",
          },
          stripeKey: "sk_test_dummy",
          stripeAccountId: "acct_test",
          stripeOrganizationId: "org_test",
          stripe,
          orderProof: async () => ({
            success: true,
            data: {
              paymentReference: "payment_123",
              orderReference: "order_123",
              status: "checkout_created",
              paymentStatus: "pending",
            },
          }),
        }),
      ).rejects.toThrow("Canonical saved order/Stripe paid proof missing")
      expect(calls.every((call) => call.startsWith("GET "))).toBe(true)
      expect(submits).toBe(1)
      expect(context.checkpoint.ticket).toMatchObject({
        step: "payment",
        status: "started",
        orderId: "order-1",
        stripeSession: "cs_test_123456789",
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
