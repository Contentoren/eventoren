import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "@rstest/core"
import { e2eCheckpointLoad } from "../../checkpoint/e2eCheckpointLoad.ts"
import { e2eCheckpointSave } from "../../checkpoint/e2eCheckpointSave.ts"
import type { TicketPurchaseContext } from "./TicketPurchaseContext.ts"
import { ticketPurchaseCheckoutStep } from "./ticketPurchaseCheckoutStep.ts"
import { ticketPurchasePaymentStep } from "./ticketPurchasePaymentStep.ts"
import { ticketPurchaseStepRun } from "./ticketPurchaseStepRun.ts"

describe("ticket purchase stage persistence", () => {
  it("records the exact checkout session and order before completion and never repeats a started payment", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-step-test-"))
    try {
      const context = {
        directory,
        checkpoint: {
          version: 1 as const,
          target: "development" as const,
          baseUrl: "https://eventoren.leonardomora.de" as const,
          runId: "abc-12345678-1234-1234-1234-123456789abc",
          createdAt: 1_000_000,
          phase: "ticket-unreconciled" as const,
          ticket: {
            step: "publication" as const,
            status: "completed" as const,
            eventKey: "ticket-e2e-abc-12345678-1234-1234-1234-123456789abc",
            eventTitle: "Ticket E2E abc-12345678-1234-1234-1234-123456789abc",
            participantName: "E2E Participant abc-12345678-1234-1234-1234-123456789abc",
            mailSince: 1_000_000,
          },
        },
      } as TicketPurchaseContext
      expect((await e2eCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      await ticketPurchaseStepRun(context, "checkout", false, async (_done, record) => {
        const during = await e2eCheckpointLoad(directory, context.checkpoint)
        expect(during.success && during.data?.ticket?.status).toBe("started")
        await record({ stripeSession: "cs_test_123456789", orderId: "order-1" })
      })
      expect(context.checkpoint.ticket).toMatchObject({
        step: "checkout",
        status: "completed",
        stripeSession: "cs_test_123456789",
        orderId: "order-1",
      })
      let assertions = 0
      await ticketPurchaseStepRun(context, "checkout", true, async () => {
        assertions += 1
      })
      await ticketPurchaseStepRun(context, "checkout", true, async () => {
        assertions += 1
      })
      expect(assertions).toBe(2)
      await expect(
        ticketPurchaseStepRun(context, "payment", false, async () => {
          throw new Error("after external payment")
        }),
      ).rejects.toThrow("after external payment")
      let repeated = false
      await expect(
        ticketPurchaseStepRun(context, "payment", false, async () => {
          repeated = true
        }),
      ).rejects.toThrow("uncertain external effect")
      expect(repeated).toBe(false)
      expect((await e2eCheckpointLoad(directory, context.checkpoint)).success).toBe(true)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("skips completed checkout and payment with saved evidence, then advances to delivery assertions", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-step-test-"))
    try {
      const context = {
        directory,
        checkpoint: {
          version: 1 as const,
          target: "development" as const,
          baseUrl: "https://eventoren.leonardomora.de" as const,
          runId: "abc-12345678-1234-1234-1234-123456789abc",
          createdAt: 1_000_000,
          phase: "ticket-unreconciled" as const,
          ticket: {
            step: "payment" as const,
            status: "completed" as const,
            eventKey: "ticket-e2e-abc-12345678-1234-1234-1234-123456789abc",
            eventTitle: "Ticket E2E abc-12345678-1234-1234-1234-123456789abc",
            participantName: "E2E Participant abc-12345678-1234-1234-1234-123456789abc",
            mailSince: 1_000_000,
            stripeSession: "cs_test_123456789",
            orderId: "order-1",
          },
        },
        browser: {
          newContext: () => {
            throw new Error("second checkout")
          },
        },
      } as unknown as TicketPurchaseContext
      expect((await e2eCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      await ticketPurchaseCheckoutStep(context)
      await ticketPurchasePaymentStep(context)
      let deliveryAsserted = false
      await ticketPurchaseStepRun(context, "delivery", true, async () => {
        deliveryAsserted = true
      })
      expect(deliveryAsserted).toBe(true)
      expect(context.checkpoint.ticket).toMatchObject({ step: "delivery", status: "completed", orderId: "order-1" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("refuses to replay checkout without the exact saved evidence or with a changed checkpoint", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-step-test-"))
    try {
      const context = {
        directory,
        checkpoint: {
          version: 1 as const,
          target: "development" as const,
          baseUrl: "https://eventoren.leonardomora.de" as const,
          runId: "abc-12345678-1234-1234-1234-123456789abc",
          createdAt: 1_000_000,
          phase: "ticket-unreconciled" as const,
          ticket: {
            step: "checkout" as const,
            status: "completed" as const,
            eventKey: "ticket-e2e-abc-12345678-1234-1234-1234-123456789abc",
            eventTitle: "Ticket E2E abc-12345678-1234-1234-1234-123456789abc",
            participantName: "E2E Participant abc-12345678-1234-1234-1234-123456789abc",
            mailSince: 1_000_000,
            stripeSession: "cs_test_123456789",
            orderId: "order-1",
          },
        },
        browser: {
          newContext: () => {
            throw new Error("second checkout")
          },
        },
      } as unknown as TicketPurchaseContext
      expect((await e2eCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      await ticketPurchaseCheckoutStep(context)
      await expect(ticketPurchasePaymentStep(context)).rejects.toThrow("hosted session is no longer open")
      context.checkpoint.ticket.orderId = undefined
      await expect(ticketPurchaseCheckoutStep(context)).rejects.toThrow("exact saved order")
      context.checkpoint.ticket.orderId = "different-order"
      await expect(ticketPurchaseCheckoutStep(context)).rejects.toThrow("evidence changed")
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("fails closed when the Stripe browser URL is unavailable", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-step-test-"))
    try {
      const context = {
        directory,
        checkpoint: {
          version: 1 as const,
          target: "development" as const,
          baseUrl: "https://eventoren.leonardomora.de" as const,
          runId: "abc-12345678-1234-1234-1234-123456789abc",
          createdAt: 1_000_000,
          phase: "ticket-unreconciled" as const,
          ticket: {
            step: "checkout" as const,
            status: "completed" as const,
            eventKey: "ticket-e2e-abc-12345678-1234-1234-1234-123456789abc",
            eventTitle: "Ticket E2E abc-12345678-1234-1234-1234-123456789abc",
            participantName: "E2E Participant abc-12345678-1234-1234-1234-123456789abc",
            mailSince: 1_000_000,
            stripeSession: "cs_test_123456789",
            orderId: "order-1",
          },
        },
        checkoutPage: {
          url: () => {
            throw new Error("browser closed")
          },
        },
      } as unknown as TicketPurchaseContext
      expect((await e2eCheckpointSave(directory, context.checkpoint)).success).toBe(true)
      await expect(ticketPurchasePaymentStep(context)).rejects.toThrow("Exact test checkout session")
      expect(context.checkpoint.ticket).toMatchObject({ step: "payment", status: "started" })
      expect((await e2eCheckpointLoad(directory, context.checkpoint)).success).toBe(true)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
