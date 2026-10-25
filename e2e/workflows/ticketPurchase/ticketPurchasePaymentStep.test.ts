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

function stripePaymentFixture(session: Record<string, unknown>, customer: Record<string, unknown>) {
  const calls: string[] = []
  const stripe = e2eStripeTestClientCreate("sk_test_dummy", (async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    const path = new URL(String(url)).pathname
    calls.push(`${init?.method} ${path}`)
    if (path.endsWith("/account")) return Response.json({ id: "acct_test" })
    if (path.includes("/checkout/sessions/")) return Response.json(session)
    if (path.includes("/customers/")) return Response.json(customer)
    return Response.json({ data: [], has_more: false })
  }) as typeof fetch)
  return { calls, stripe }
}

const paymentProofInput = (stripe: ReturnType<typeof e2eStripeTestClientCreate>) => ({
  environment: {
    E2E_TARGET: "development",
    E2E_CLEANUP_CONVEX_URL: "https://eventoren-convex.leonardomora.de",
  },
  stripeKey: "sk_test_dummy",
  stripeAccountId: "acct_test",
  stripeOrganizationId: "org_test",
  stripe,
})

const pendingOrderProof = async () => ({
  success: true,
  data: {
    paymentReference: "payment_123",
    orderReference: "order_123",
    status: "checkout_created",
    paymentStatus: "pending",
  },
})

const paidOrderProof = async () => ({
  success: true,
  data: {
    paymentReference: "payment_123",
    orderReference: "order_123",
    status: "paid",
    paymentStatus: "paid",
  },
})

function openUnpaidSession() {
  return {
    id: "cs_test_123456789",
    livemode: false,
    mode: "payment",
    status: "open",
    payment_status: "unpaid",
    customer: "cus_123",
    subscription: null,
    url: "https://checkout.stripe.com/c/pay/cs_test_123456789#saved",
    payment_intent: null,
    metadata: {
      source: "eventoren_ticket",
      event_key: `ticket-e2e-${runId}`,
      organization_id: "org_test",
      stripe_mode: "test",
      payment_reference: "payment_123",
      order_reference: "order_123",
    },
  }
}

function stableTestCustomer() {
  return {
    id: "cus_123",
    livemode: false,
    metadata: {
      source: "eventoren_ticket",
      event_key: `ticket-e2e-${runId}`,
      organization_id: "org_test",
      stripe_mode: "test",
      payment_reference: "payment_123",
      order_reference: "order_123",
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

  it("retains the payment-started checkpoint for missing backend and credentials without touching the page", async () => {
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
      await expect(ticketPurchasePaymentStep(context, { environment: {} })).rejects.toThrow("uncertain external effect")
      expect(pageTouched).toBe(false)
      expect(context.checkpoint.ticket).toMatchObject({ step: "payment", status: "started" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retains without a new checkout when completed checkout has no page and credentials are missing", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-payment-test-"))
    try {
      let checkoutCreates = 0
      const context = {
        directory,
        checkpoint: checkpointBase("checkout", "completed"),
        browser: {
          newContext: () => {
            checkoutCreates += 1
            return Promise.reject(new Error("second checkout must not be created"))
          },
        },
      } as unknown as TicketPurchaseContext
      expect((await e2eCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      await expect(ticketPurchasePaymentStep(context, { environment: {} })).rejects.toThrow("uncertain external effect")
      expect(checkoutCreates).toBe(0)
      expect(context.checkpoint.ticket).toMatchObject({ step: "payment", status: "started" })
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
      const { stripe } = stripePaymentFixture(openUnpaidSession(), stableTestCustomer())
      await expect(
        ticketPurchasePaymentStep(context, { ...paymentProofInput(stripe), orderProof: pendingOrderProof }),
      ).rejects.toThrow("Exact test checkout session")
      expect(context.checkpoint.ticket).toMatchObject({ step: "payment", status: "started" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("fresh refused payment proof leaves the hosted form untouched", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-payment-test-"))
    try {
      let pageTouched = false
      const context = {
        directory,
        checkpoint: checkpointBase("checkout", "completed"),
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
      const foreignSession = {
        ...openUnpaidSession(),
        metadata: { ...openUnpaidSession().metadata, event_key: "ticket-e2e-foreign" },
      }
      const { calls, stripe } = stripePaymentFixture(foreignSession, stableTestCustomer())
      await expect(
        ticketPurchasePaymentStep(context, { ...paymentProofInput(stripe), orderProof: pendingOrderProof }),
      ).rejects.toThrow("unique run/organization/order ownership")
      expect(pageTouched).toBe(false)
      expect(calls.every((call) => call.startsWith("GET "))).toBe(true)
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

  it("fresh exact paid proof adopts without touching the browser", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-payment-test-"))
    try {
      let pageTouched = false
      const context = {
        directory,
        checkpoint: checkpointBase("checkout", "completed"),
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
      const paidSession = { ...openUnpaidSession(), status: "complete", payment_status: "paid" }
      const { calls, stripe } = stripePaymentFixture(paidSession, stableTestCustomer())
      await ticketPurchasePaymentStep(context, { ...paymentProofInput(stripe), orderProof: paidOrderProof })
      expect(pageTouched).toBe(false)
      expect(calls.every((call) => call.startsWith("GET "))).toBe(true)
      expect(context.checkpoint.ticket).toMatchObject({
        step: "payment",
        status: "completed",
        orderId: "order-1",
        stripeSession: "cs_test_123456789",
      })
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

  for (const [contactLabel, cardholderLabel] of [
    ["Vollständiger Name", "Name des/der Karteninhaber/in"],
    ["Full name", "Cardholder name"],
    ["Name", "Cardholder name"],
  ]) {
    it(`fills separate contact and cardholder controls on the ${contactLabel} form before submitting`, async () => {
      const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-payment-test-"))
      try {
        const controls = [
          { label: contactLabel, value: "" },
          { label: cardholderLabel, value: "" },
          { label: "Card number", value: "" },
          { label: "Expiration date", value: "" },
          { label: "Company name", value: "" },
        ]
        const filledLabels: string[] = []
        let submits = 0
        const field = { ...locatorFake({ count: 1 }), fill: async () => {}, click: async () => {} }
        const page = {
          url: () => openUnpaidSession().url,
          getByRole: () => field,
          getByLabel: (label: RegExp) => {
            const matches = controls.filter((control) => label.test(control.label))
            return {
              ...locatorFake({ count: matches.length }),
              fill: async (value: string) => {
                expect(matches.length).toBe(1)
                matches[0].value = value
                filledLabels.push(matches[0].label)
              },
            }
          },
          getByText: () => field,
          locator: () => field,
          getByTestId: () => ({
            click: async () => {
              expect(controls[0].value).toBe(`E2E Participant ${runId}`)
              expect(controls[1].value).toBe("E2E Ticket Test")
              submits += 1
            },
          }),
        }
        const context = {
          directory,
          checkpoint: checkpointBase("payment", "started"),
          checkoutPage: page,
        } as unknown as TicketPurchaseContext
        expect((await e2eCheckpointSave(directory, context.checkpoint)).success).toBe(true)
        const { stripe } = stripePaymentFixture(openUnpaidSession(), stableTestCustomer())
        await expect(
          ticketPurchasePaymentStep(context, {
            ...paymentProofInput(stripe),
            orderProof: pendingOrderProof,
            proofTimeoutMs: 0,
            proofPollIntervalMs: 0,
          }),
        ).rejects.toThrow("Canonical saved order/Stripe paid proof missing")
        expect(filledLabels).toEqual([contactLabel, "Card number", "Expiration date", cardholderLabel])
        expect(controls[4].value).toBe("")
        expect(submits).toBe(1)
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    })
  }

  it("single submit without fulfilled paid proof retains the same payment-started receipt", async () => {
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
          proofTimeoutMs: 0,
          proofPollIntervalMs: 0,
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

  it("pending submit flips to paid then completes and closes the restored guest without original storage", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-payment-test-"))
    try {
      let fulfilled = false
      let submits = 0
      let restoredContexts = 0
      let closedContexts = 0
      const orderProof = async () =>
        fulfilled
          ? {
              success: true as const,
              data: {
                paymentReference: "payment_123",
                orderReference: "order_123",
                status: "paid",
                paymentStatus: "paid",
              },
            }
          : {
              success: true as const,
              data: {
                paymentReference: "payment_123",
                orderReference: "order_123",
                status: "checkout_created",
                paymentStatus: "pending",
              },
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
          return fulfilled
            ? Response.json({
                id: "cs_test_123456789",
                livemode: false,
                mode: "payment",
                status: "complete",
                payment_status: "paid",
                customer: "cus_123",
                subscription: null,
                metadata: {
                  source: "eventoren_ticket",
                  event_key: `ticket-e2e-${runId}`,
                  organization_id: "org_test",
                  stripe_mode: "test",
                  payment_reference: "payment_123",
                  order_reference: "order_123",
                },
              })
            : Response.json(openUnpaidSession())
        if (path.includes("/customers/")) return Response.json(stableTestCustomer())
        return Response.json({ data: [], has_more: false })
      }) as typeof fetch)
      const cardField = {
        ...locatorFake({ count: 1 }),
        isVisible: async () => true,
        fill: async () => {},
        click: async () => {},
      }
      const fakePage = {
        url: () => "https://checkout.stripe.com/c/pay/cs_test_123456789#saved",
        goto: async () => {},
        getByRole: (role: string) => (String(role).includes("radio") ? locatorFake({ count: 0 }) : cardField),
        getByLabel: () => cardField,
        getByText: () => cardField,
        locator: () => cardField,
        getByTestId: () => ({
          click: async () => {
            submits += 1
            fulfilled = true
          },
        }),
      }
      const context = {
        directory,
        checkpoint: checkpointBase("checkout", "completed"),
        browser: {
          newContext: async () => {
            restoredContexts += 1
            return {
              newPage: async () => fakePage,
              storageState: async () => {
                throw new Error("restored guest has no original storage")
              },
              close: async () => {
                closedContexts += 1
              },
            }
          },
        },
        browserErrors: { observe: () => {} },
      } as unknown as TicketPurchaseContext
      expect((await e2eCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      await ticketPurchasePaymentStep(context, {
        ...paymentProofInput(stripe),
        orderProof,
        proofTimeoutMs: 5_000,
        proofPollIntervalMs: 0,
      })
      expect(submits).toBe(1)
      expect(restoredContexts).toBe(1)
      expect(closedContexts).toBe(1)
      expect(context.guestContext).toBe(undefined)
      expect(context.checkoutPage).toBe(undefined)
      expect(calls.every((call) => call.startsWith("GET "))).toBe(true)
      expect(context.checkpoint.ticket).toMatchObject({
        step: "payment",
        status: "completed",
        orderId: "order-1",
        stripeSession: "cs_test_123456789",
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("completed checkout without a page adopts exact paid proof without a browser", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-payment-test-"))
    try {
      let restoredContexts = 0
      const context = {
        directory,
        checkpoint: checkpointBase("checkout", "completed"),
        browser: {
          newContext: async () => {
            restoredContexts += 1
            throw new Error("paid adoption must not restore a guest")
          },
        },
        browserErrors: { observe: () => {} },
      } as unknown as TicketPurchaseContext
      expect((await e2eCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      const paidSession = { ...openUnpaidSession(), status: "complete", payment_status: "paid" }
      const { calls, stripe } = stripePaymentFixture(paidSession, stableTestCustomer())
      await ticketPurchasePaymentStep(context, { ...paymentProofInput(stripe), orderProof: paidOrderProof })
      expect(restoredContexts).toBe(0)
      expect(calls.every((call) => call.startsWith("GET "))).toBe(true)
      expect(context.checkpoint.ticket).toMatchObject({
        step: "payment",
        status: "completed",
        orderId: "order-1",
        stripeSession: "cs_test_123456789",
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("changed checkpoint during form preparation never submits", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-payment-test-"))
    try {
      let submits = 0
      let tampered = false
      const cardField = {
        ...locatorFake({ count: 1 }),
        isVisible: async () => true,
        fill: async () => {
          if (!tampered) {
            tampered = true
            await e2eCheckpointSave(directory, checkpointBase("payment", "completed"))
          }
        },
        click: async () => {},
      }
      const context = {
        directory,
        checkpoint: checkpointBase("payment", "started"),
        checkoutPage: {
          url: () => "https://checkout.stripe.com/c/pay/cs_test_123456789#saved",
          getByRole: (role: string) => (String(role).includes("radio") ? locatorFake({ count: 0 }) : cardField),
          getByLabel: () => cardField,
          getByText: () => cardField,
          locator: () => cardField,
          getByTestId: () => ({
            click: async () => {
              submits += 1
            },
          }),
        },
        browserErrors: { observe: () => {} },
      } as unknown as TicketPurchaseContext
      expect((await e2eCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      const { stripe } = stripePaymentFixture(openUnpaidSession(), stableTestCustomer())
      await expect(
        ticketPurchasePaymentStep(context, {
          ...paymentProofInput(stripe),
          orderProof: pendingOrderProof,
          proofTimeoutMs: 0,
          proofPollIntervalMs: 0,
        }),
      ).rejects.toThrow("checkpoint changed")
      expect(tampered).toBe(true)
      expect(submits).toBe(0)
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

  it("pending app proof catches up to Stripe paid after one submit with no second submit", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-payment-test-"))
    try {
      let submits = 0
      let appPolls = 0
      let closedContexts = 0
      const orderProof = async () => {
        if (submits === 0)
          return {
            success: true as const,
            data: {
              paymentReference: "payment_123",
              orderReference: "order_123",
              status: "checkout_created",
              paymentStatus: "pending",
            },
          }
        appPolls += 1
        return appPolls < 3
          ? {
              success: true as const,
              data: {
                paymentReference: "payment_123",
                orderReference: "order_123",
                status: "checkout_created",
                paymentStatus: "pending",
              },
            }
          : {
              success: true as const,
              data: {
                paymentReference: "payment_123",
                orderReference: "order_123",
                status: "paid",
                paymentStatus: "paid",
              },
            }
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
          return submits === 0
            ? Response.json(openUnpaidSession())
            : Response.json({ ...openUnpaidSession(), status: "complete", payment_status: "paid" })
        if (path.includes("/customers/")) return Response.json(stableTestCustomer())
        return Response.json({ data: [], has_more: false })
      }) as typeof fetch)
      const cardField = {
        ...locatorFake({ count: 1 }),
        isVisible: async () => true,
        fill: async () => {},
        click: async () => {},
      }
      const fakePage = {
        url: () => "https://checkout.stripe.com/c/pay/cs_test_123456789#saved",
        goto: async () => {},
        getByRole: (role: string) => (String(role).includes("radio") ? locatorFake({ count: 0 }) : cardField),
        getByLabel: () => cardField,
        getByText: () => cardField,
        locator: () => cardField,
        getByTestId: () => ({
          click: async () => {
            submits += 1
          },
        }),
      }
      const context = {
        directory,
        checkpoint: checkpointBase("checkout", "completed"),
        browser: {
          newContext: async () => ({
            newPage: async () => fakePage,
            close: async () => {
              closedContexts += 1
            },
          }),
        },
        browserErrors: { observe: () => {} },
      } as unknown as TicketPurchaseContext
      expect((await e2eCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      await ticketPurchasePaymentStep(context, {
        ...paymentProofInput(stripe),
        orderProof,
        proofTimeoutMs: 5_000,
        proofPollIntervalMs: 0,
      })
      expect(submits).toBe(1)
      expect(appPolls).toBeGreaterThanOrEqual(3)
      expect(closedContexts).toBe(1)
      expect(context.checkpoint.ticket).toMatchObject({
        step: "payment",
        status: "completed",
        orderId: "order-1",
        stripeSession: "cs_test_123456789",
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("foreign and refused proof never restores a hosted page or submits", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-payment-test-"))
    try {
      let submits = 0
      let restoredContexts = 0
      const cardField = {
        ...locatorFake({ count: 1 }),
        isVisible: async () => true,
        fill: async () => {},
        click: async () => {},
      }
      const context = {
        directory,
        checkpoint: checkpointBase("payment", "started"),
        checkoutPage: {
          url: () => "https://checkout.stripe.com/c/pay/cs_test_123456789#saved",
          getByRole: (role: string) => (String(role).includes("radio") ? locatorFake({ count: 0 }) : cardField),
          getByLabel: () => cardField,
          getByText: () => cardField,
          locator: () => cardField,
          getByTestId: () => ({
            click: async () => {
              submits += 1
            },
          }),
        },
        browser: {
          newContext: async () => {
            restoredContexts += 1
            throw new Error("refused proof must not restore a guest")
          },
        },
        browserErrors: { observe: () => {} },
      } as unknown as TicketPurchaseContext
      expect((await e2eCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      const foreignSession = {
        ...openUnpaidSession(),
        metadata: { ...openUnpaidSession().metadata, event_key: "ticket-e2e-foreign" },
      }
      const { calls, stripe } = stripePaymentFixture(foreignSession, stableTestCustomer())
      await expect(
        ticketPurchasePaymentStep(context, {
          ...paymentProofInput(stripe),
          orderProof: pendingOrderProof,
          proofTimeoutMs: 0,
          proofPollIntervalMs: 0,
        }),
      ).rejects.toThrow("unique run/organization/order ownership")
      expect(restoredContexts).toBe(0)
      expect(submits).toBe(0)
      expect(calls.every((call) => call.startsWith("GET "))).toBe(true)
      expect(context.checkpoint.ticket).toMatchObject({ step: "payment", status: "started" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
