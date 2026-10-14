import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import type { TicketOrderProjection } from "./TicketOrderProjection.ts"
import { ticketOrderWalletPassStateCreate } from "./ticketOrderWalletPassStateCreate.ts"

const testTicketCreate = (overrides: Partial<TicketOrderProjection["tickets"][number]> = {}) => ({
  id: "ticket-1",
  sequence: 1,
  code: "TICK-ABC-123",
  eventKey: "event-key",
  eventTitle: "Event",
  eventStartsAt: "2026-10-01T18:00:00.000Z",
  eventDoorsAt: "2026-10-01T17:00:00.000Z",
  venue: "Venue",
  city: "Berlin",
  address: "Street 1",
  tierKey: "tier-standard",
  tierName: "Standard Ticket",
  priceCents: 2500,
  feeCents: 150,
  issuedAt: "2026-09-15T08:00:00.000Z",
  ...overrides,
})

const testOrderCreate = (overrides: Partial<TicketOrderProjection> = {}): TicketOrderProjection => ({
  id: "order-1",
  checkoutKey: "checkout-key",
  eventKey: "event-key",
  eventTitle: "Summer Open Air 2026",
  eventSubtitle: "Live in Berlin",
  eventDescription: "Great music festival",
  eventStartsAt: "2026-10-01T18:00:00.000Z",
  eventEndsAt: "2026-10-01T23:00:00.000Z",
  eventDoorsAt: "2026-10-01T17:00:00.000Z",
  venue: "Kulturbrauerei",
  city: "Berlin",
  address: "Schönhauser Allee 36",
  organizer: "Eventoren",
  imageUrl: "",
  imageAlt: "",
  catalogVersion: 1,
  contact: {
    email: "buyer@example.test",
    givenName: "Anna",
    familyName: "Schmidt",
    phone: "+49123456789",
  },
  subtotalCents: 5000,
  feeCents: 300,
  totalCents: 5300,
  paymentReference: "pay-ref-1",
  stripeMode: "test",
  status: "paid",
  paymentStatus: "paid",
  createdAt: "2026-09-15T08:00:00.000Z",
  updatedAt: "2026-09-15T08:00:00.000Z",
  lines: [],
  tickets: [testTicketCreate()],
  ...overrides,
})

describe("ticketOrderWalletPassStateCreate", () => {
  describe("wallet modal state management", () => {
    it("starts with closed wallet dialog (null walletType and null ticket)", () => {
      const state = ticketOrderWalletPassStateCreate({ order: () => testOrderCreate() })

      expect(state.selectedWalletType()).toBeNull()
      expect(state.selectedTicket()).toBeNull()
    })

    it("opens Apple Wallet dialog with target ticket", () => {
      const ticket = testTicketCreate({ id: "ticket-apple", sequence: 2, tierName: "VIP Pass" })
      const state = ticketOrderWalletPassStateCreate({
        order: () => testOrderCreate({ tickets: [ticket] }),
      })

      state.openAppleWallet(ticket)

      expect(state.selectedWalletType()).toBe("apple")
      expect(state.selectedTicket()).toEqual(ticket)
    })

    it("opens Google Wallet dialog with target ticket", () => {
      const ticket = testTicketCreate({ id: "ticket-google", sequence: 3, tierName: "Early Bird" })
      const state = ticketOrderWalletPassStateCreate({
        order: () => testOrderCreate({ tickets: [ticket] }),
      })

      state.openGoogleWallet(ticket)

      expect(state.selectedWalletType()).toBe("google")
      expect(state.selectedTicket()).toEqual(ticket)
    })

    it("closes wallet dialog and resets both walletType and ticket", () => {
      const ticket = testTicketCreate()
      const state = ticketOrderWalletPassStateCreate({ order: () => testOrderCreate() })

      state.openAppleWallet(ticket)
      expect(state.selectedWalletType()).toBe("apple")
      expect(state.selectedTicket()).toEqual(ticket)

      state.closeWalletDialog()
      expect(state.selectedWalletType()).toBeNull()
      expect(state.selectedTicket()).toBeNull()
    })
  })

  describe("statusLabel and statusTone", () => {
    it("returns Storniert and danger tone when cancellation is present", () => {
      const state = ticketOrderWalletPassStateCreate({
        order: () =>
          testOrderCreate({
            paymentStatus: "failed",
            cancellation: {
              cancelledAt: "2026-10-12T12:00:00.000Z",
              organizationId: "org-1",
              eventKey: "event-key",
              orderReference: "ord-ref",
              paymentReference: "pay-ref",
              stripeMode: "test",
              paymentMethodType: "sepa_debit",
              stripeEventId: "evt_1",
              stripeSessionId: "cs_1",
              stripePaymentIntentId: "pi_1",
              reason: "payment_failed",
              stripeEventType: "checkout.session.async_payment_failed",
              stripeChargeId: null,
              stripeDisputeId: null,
            },
          }),
      })

      expect(state.statusLabel()).toBe("Storniert")
      expect(state.statusTone()).toBe("danger")
    })

    it("returns Prüfung erforderlich and warning tone on paid_inventory_conflict", () => {
      const state = ticketOrderWalletPassStateCreate({
        order: () => testOrderCreate({ status: "paid_inventory_conflict" }),
      })

      expect(state.statusLabel()).toBe("Prüfung erforderlich")
      expect(state.statusTone()).toBe("warning")
    })

    it("returns Bezahlt and success tone for paid orders", () => {
      const state = ticketOrderWalletPassStateCreate({
        order: () => testOrderCreate({ paymentStatus: "paid" }),
      })

      expect(state.statusLabel()).toBe("Bezahlt")
      expect(state.statusTone()).toBe("success")
    })

    it("returns SEPA in Bearbeitung and brand tone for pending orders with early-issued tickets", () => {
      const state = ticketOrderWalletPassStateCreate({
        order: () =>
          testOrderCreate({
            paymentStatus: "pending",
            ticketsIssuedAt: "2026-10-01T12:00:00.000Z",
          }),
      })

      expect(state.statusLabel()).toBe("SEPA in Bearbeitung")
      expect(state.statusTone()).toBe("brand")
    })

    it("returns Wird bestätigt and brand tone for pending orders without issued tickets", () => {
      const state = ticketOrderWalletPassStateCreate({
        order: () => testOrderCreate({ paymentStatus: "pending", ticketsIssuedAt: undefined }),
      })

      expect(state.statusLabel()).toBe("Wird bestätigt")
      expect(state.statusTone()).toBe("brand")
    })

    it("returns Abgelaufen and danger tone for expired orders", () => {
      const state = ticketOrderWalletPassStateCreate({
        order: () => testOrderCreate({ paymentStatus: "expired" }),
      })

      expect(state.statusLabel()).toBe("Abgelaufen")
      expect(state.statusTone()).toBe("danger")
    })

    it("returns Fehlgeschlagen and danger tone for failed orders", () => {
      const state = ticketOrderWalletPassStateCreate({
        order: () => testOrderCreate({ paymentStatus: "failed" }),
      })

      expect(state.statusLabel()).toBe("Fehlgeschlagen")
      expect(state.statusTone()).toBe("danger")
    })
  })

  describe("dateTime formatting", () => {
    it("formats event start date and time in Europe/Berlin timezone", () => {
      const state = ticketOrderWalletPassStateCreate({
        order: () => testOrderCreate({ eventStartsAt: "2026-10-01T18:00:00.000Z" }),
      })

      // 18:00 UTC on 2026-10-01 is 20:00 CEST (UTC+2)
      expect(state.dateTime()).toBe("Do., 01. Okt. 2026 · 20:00 Uhr")
    })
  })

  describe("participant, ticket and order presentation helpers", () => {
    it("uses ticket participantName when specified", () => {
      const ticket = testTicketCreate({ participantName: "Max Mustermann" })
      const state = ticketOrderWalletPassStateCreate({ order: () => testOrderCreate() })

      expect(state.participantName(ticket)).toBe("Max Mustermann")
    })

    it("falls back to buyer name when participantName is absent", () => {
      const ticket = testTicketCreate({ participantName: undefined })
      const state = ticketOrderWalletPassStateCreate({
        order: () =>
          testOrderCreate({
            contact: {
              email: "buyer@example.test",
              givenName: "Erika",
              familyName: "Musterfrau",
              phone: "",
            },
          }),
      })

      expect(state.participantName(ticket)).toBe("Erika Musterfrau (Käufer:in)")
    })

    it("generates ticketTitle and ticketQrLabel correctly", () => {
      const ticket = testTicketCreate({ sequence: 4, tierName: "Backstage Pass" })
      const state = ticketOrderWalletPassStateCreate({ order: () => testOrderCreate() })

      expect(state.ticketTitle(ticket)).toBe("Ticket 4 · Backstage Pass")
      expect(state.ticketQrLabel(ticket)).toBe("QR-Code für Ticket 4")
    })

    it("formats total price and ticketCountLabel", () => {
      const state = ticketOrderWalletPassStateCreate({
        order: () =>
          testOrderCreate({
            totalCents: 5300,
            tickets: [testTicketCreate({ sequence: 1 }), testTicketCreate({ sequence: 2 })],
          }),
      })

      expect(state.total()).toBe("53,00 €")
      expect(state.ticketCountLabel()).toBe("2 Tickets")
    })
  })

  describe("isAppleWalletAvailable and isGoogleWalletAvailable", () => {
    const originalEnv = { ...process.env }

    beforeEach(() => {
      delete process.env.PUBLIC_APPLE_WALLET_PASS_TYPE_ID
      delete process.env.VITE_APPLE_WALLET_PASS_TYPE_ID
      delete process.env.PUBLIC_APPLE_WALLET_ENABLED
      delete process.env.PUBLIC_GOOGLE_WALLET_ISSUER_ID
      delete process.env.VITE_GOOGLE_WALLET_ISSUER_ID
      delete process.env.PUBLIC_GOOGLE_WALLET_ENABLED
    })

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    it("returns false for both when env is disabled and ticket has no wallet urls", () => {
      const state = ticketOrderWalletPassStateCreate({ order: () => testOrderCreate() })
      const ticket = testTicketCreate()

      expect(state.isAppleWalletAvailable(ticket)).toBe(false)
      expect(state.isGoogleWalletAvailable(ticket)).toBe(false)
    })

    it("returns true for Apple Wallet when env enables it, even without ticket url", () => {
      process.env.PUBLIC_APPLE_WALLET_PASS_TYPE_ID = "pass.com.eventoren"
      const state = ticketOrderWalletPassStateCreate({ order: () => testOrderCreate() })
      const ticket = testTicketCreate()

      expect(state.isAppleWalletAvailable(ticket)).toBe(true)
      expect(state.isGoogleWalletAvailable(ticket)).toBe(false)
    })

    it("returns true for Google Wallet when env enables it, even without ticket url", () => {
      process.env.PUBLIC_GOOGLE_WALLET_ISSUER_ID = "issuer-12345"
      const state = ticketOrderWalletPassStateCreate({ order: () => testOrderCreate() })
      const ticket = testTicketCreate()

      expect(state.isAppleWalletAvailable(ticket)).toBe(false)
      expect(state.isGoogleWalletAvailable(ticket)).toBe(true)
    })

    it("returns true for Apple Wallet when ticket has appleWalletPassUrl even if env is disabled", () => {
      const state = ticketOrderWalletPassStateCreate({ order: () => testOrderCreate() })
      const ticket = testTicketCreate({ appleWalletPassUrl: "https://example.test/pass.pkpass" })

      expect(state.isAppleWalletAvailable(ticket)).toBe(true)
      expect(state.isGoogleWalletAvailable(ticket)).toBe(false)
    })

    it("returns true for Google Wallet when ticket has googleWalletSaveUrl even if env is disabled", () => {
      const state = ticketOrderWalletPassStateCreate({ order: () => testOrderCreate() })
      const ticket = testTicketCreate({ googleWalletSaveUrl: "https://pay.google.com/gp/v/save/xyz" })

      expect(state.isAppleWalletAvailable(ticket)).toBe(false)
      expect(state.isGoogleWalletAvailable(ticket)).toBe(true)
    })

    it("returns false when ticket wallet urls are empty strings and env is disabled", () => {
      const state = ticketOrderWalletPassStateCreate({ order: () => testOrderCreate() })
      const ticket = testTicketCreate({
        appleWalletPassUrl: "",
        googleWalletSaveUrl: "",
      })

      expect(state.isAppleWalletAvailable(ticket)).toBe(false)
      expect(state.isGoogleWalletAvailable(ticket)).toBe(false)
    })
  })
})
