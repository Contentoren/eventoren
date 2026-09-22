import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { demoAdminNavStateCreate } from "../src/demo/state/demoAdminNavStateCreate.ts"
import { demoSiteFrameStateCreate } from "../src/demo/state/demoSiteFrameStateCreate.ts"
import { demoCatalogEvents } from "../src/demo/fixtures/demoCatalogEvents.ts"
import { demoAdminCatalogPageStateCreate } from "../src/demo/state/demoAdminCatalogPageStateCreate.ts"
import { demoOrganizerDataSourceCreate } from "../src/demo/fixtures/demoOrganizerDataSourceCreate.ts"
import { demoOrganizerScanScenarios } from "../src/demo/fixtures/demoOrganizerScanScenarios.ts"
import { demoCartStore } from "../src/demo/state/demoCartStore.ts"
import { demoCheckoutFormStateCreate } from "../src/demo/state/demoCheckoutFormStateCreate.ts"
import { demoOrderStatusPageStateCreate } from "../src/demo/state/demoOrderStatusPageStateCreate.ts"
import { demoOrderHistoryPageStateCreate } from "../src/demo/state/demoOrderHistoryPageStateCreate.ts"

describe("demo shared admin navigation", () => {
  test("shared admin demo nav exposes all 5 admin destinations", () => {
    const state = demoAdminNavStateCreate({ pathname: () => "/demo/admin/events" })
    const items = state.items()

    expect(items).toHaveLength(5)
    expect(items.map((item) => item.href)).toEqual([
      "/demo/admin/orders",
      "/demo/admin/events",
      "/demo/admin/organizers",
      "/demo/admin/members",
      "/demo/admin/organizer",
    ])
    expect(items.map((item) => item.label)).toEqual([
      "Bestellungen",
      "Events",
      "Veranstalter",
      "Mitglieder",
      "Ticket-Scanner",
    ])
  })

  test("active state reflects the current admin demo route", () => {
    const testCases: { pathname: string; activeHref: string }[] = [
      { pathname: "/demo/admin/orders", activeHref: "/demo/admin/orders" },
      { pathname: "/demo/admin/events", activeHref: "/demo/admin/events" },
      { pathname: "/demo/admin/events/new", activeHref: "/demo/admin/events" },
      { pathname: "/demo/admin/events-empty", activeHref: "/demo/admin/events" },
      { pathname: "/demo/admin/events-error", activeHref: "/demo/admin/events" },
      { pathname: "/demo/admin/events-unauthorized", activeHref: "/demo/admin/events" },
      { pathname: "/demo/admin/organizers", activeHref: "/demo/admin/organizers" },
      { pathname: "/demo/admin/members", activeHref: "/demo/admin/members" },
      { pathname: "/demo/admin/organizer", activeHref: "/demo/admin/organizer" },
      { pathname: "/demo/admin/organizer/event/xyz", activeHref: "/demo/admin/organizer" },
    ]

    for (const { pathname, activeHref } of testCases) {
      const state = demoAdminNavStateCreate({ pathname: () => pathname })
      const activeItems = state.items().filter((item) => item.active)
      expect(activeItems).toHaveLength(1)
      expect(activeItems[0]?.href).toBe(activeHref)
    }
  })
})

describe("demo site frame overrides", () => {
  test("header links, logo, cart and checkout destinations stay within /demo", () => {
    const frame = demoSiteFrameStateCreate({ sessionRole: "admin" })

    expect(frame.header.logoHref).toBe("/demo/customer/events")
    expect(frame.header.cartHref).toBe("/demo/customer/cart")
    expect(frame.header.checkoutHref).toBe("/demo/customer/checkout")

    expect(frame.header.navLinkHref({ to: "/", label: "Events", exact: true })).toBe("/demo/customer/events")
    expect(frame.header.navLinkHref({ to: "/organizer", label: "Veranstalter", exact: false })).toBe(
      "/demo/admin/organizer",
    )
    expect(frame.header.navLinkHref({ to: "/admin", label: "Verwaltung", exact: false })).toBe("/demo/admin/events")

    expect(frame.footerLinkHref("/impressum")).toBe("/demo/impressum")
    expect(frame.footerLinkHref("/datenschutz")).toBe("/demo/datenschutz")
    expect(frame.footerLinkHref("/agb")).toBe("/demo/agb")
    expect(frame.footerLinkHref("/kontakt")).toBe("/demo/contact")
  })

  test("header nav active state identifies subroutes for admin, events and organizer", () => {
    const frame = demoSiteFrameStateCreate({ sessionRole: "admin" })
    const isActive = frame.header.navLinkIsActive

    // Admin active on subroutes
    expect(isActive({ to: "/admin", label: "Admin", exact: false }, "/demo/admin/events", "/demo/admin/events")).toBe(
      true,
    )
    expect(isActive({ to: "/admin", label: "Admin", exact: false }, "/demo/admin/events", "/demo/admin/orders")).toBe(
      true,
    )
    expect(isActive({ to: "/admin", label: "Admin", exact: false }, "/demo/admin/events", "/demo/admin/members")).toBe(
      true,
    )
    expect(
      isActive({ to: "/admin", label: "Admin", exact: false }, "/demo/admin/events", "/demo/admin/organizers"),
    ).toBe(true)

    // Events active on catalog and event details
    expect(isActive({ to: "/", label: "Events", exact: true }, "/demo/customer/events", "/demo/customer/events")).toBe(
      true,
    )
    expect(
      isActive(
        { to: "/", label: "Events", exact: true },
        "/demo/customer/events",
        "/demo/customer/events/kraftklub-arena-berlin",
      ),
    ).toBe(true)

    // Organizer active on list and scanner
    expect(
      isActive(
        { to: "/organizer", label: "Veranstalter", exact: false },
        "/demo/admin/organizer",
        "/demo/admin/organizer",
      ),
    ).toBe(true)
    expect(
      isActive(
        { to: "/organizer", label: "Veranstalter", exact: false },
        "/demo/admin/organizer",
        "/demo/admin/organizer/event/xyz",
      ),
    ).toBe(true)
  })
})

describe("demo mock actions in admin catalog and organizer check-in", () => {
  test("catalog admin save, tier save and publish execute in-memory", async () => {
    const state = demoAdminCatalogPageStateCreate({ events: demoCatalogEvents })

    expect(state.events().length).toBeGreaterThan(0)
    const firstEvent = state.events()[0]!
    state.selectEvent(firstEvent)

    state.eventFieldChange("title", "Updated Demo Title")
    await state.saveEvent()
    expect(state.successMessage()).toContain("lokal gespeichert")

    state.tierFieldChange("tierKey", "vip-tier")
    state.tierFieldChange("name", "VIP Ticket")
    state.tierFieldChange("priceCents", "9900")
    state.tierFieldChange("feeCents", "500")
    state.tierFieldChange("capacity", "100")
    await state.saveTier()
    expect(state.successMessage()).toContain("Ticketprodukt lokal gespeichert")

    await state.publishEvent()
    expect(state.successMessage()).toContain("Event veröffentlicht")
  })

  test("organizer mock data source handles check-in, duplicates, and reset locally", async () => {
    const source = demoOrganizerDataSourceCreate()

    // Successful check-in
    const successResult = await source.ticketCheckInCode("xyz", demoOrganizerScanScenarios.success)
    expect(successResult.success).toBe(true)

    // Duplicate check-in
    const dupResult = await source.ticketCheckInCode("xyz", demoOrganizerScanScenarios.duplicate)
    expect(dupResult.success).toBe(false)
    if (!dupResult.success) {
      expect(dupResult.errorCode).toBe("organizer.check-in.duplicate")
    }

    // Wrong event
    const wrongResult = await source.ticketCheckInCode("xyz", demoOrganizerScanScenarios.wrongEvent)
    expect(wrongResult.success).toBe(false)
    if (!wrongResult.success) {
      expect(wrongResult.errorCode).toBe("organizer.check-in.wrong-event")
    }

    // Reset check-in
    const resetResult = await source.ticketReset("xyz", "demo-ticket-bea" as any)
    expect(resetResult.success).toBe(true)
    if (resetResult.success) {
      expect(resetResult.data?.checkedIn).toBe(false)
    }
  })
})

describe("demo customer browsing, cart, checkout and orders flow", () => {
  test("cart store adds items and updates draft in-memory", () => {
    demoCartStore.clear()
    expect(demoCartStore.draft()).toHaveLength(0)

    demoCartStore.addOrUpdate({
      eventId: "kraftklub-arena-berlin",
      lines: [{ tierId: "stehplatz-innenraum", quantity: 2 }],
    })
    expect(demoCartStore.draft()).toHaveLength(1)
    expect(demoCartStore.draft()[0]?.lines[0]?.quantity).toBe(2)

    demoCartStore.updateQuantity("kraftklub-arena-berlin", "stehplatz-innenraum", 3)
    expect(demoCartStore.draft()[0]?.lines[0]?.quantity).toBe(3)

    demoCartStore.clear()
    expect(demoCartStore.draft()).toHaveLength(0)
  })

  test("checkout form completes order and generates wallet pass without external call", async () => {
    demoCartStore.clear()
    demoCartStore.addOrUpdate({
      eventId: "kraftklub-arena-berlin",
      lines: [{ tierId: "innenraum", quantity: 1 }],
    })

    await new Promise<void>((resolve) => {
      createRoot(async (dispose) => {
        const state = demoCheckoutFormStateCreate({
          events: demoCatalogEvents,
          relaxedValidation: true,
        })

        expect(state.items().length).toBeGreaterThan(0)
        state.participantNameChange("kraftklub-arena-berlin", "innenraum", 0, "Alex Demo")
        state.legalAcceptanceChange(true)

        await state.confirmPayment()

        expect(state.completedOrders().length).toBe(1)
        const order = state.completedOrders()[0]!
        expect(order.status).toBe("paid")
        expect(order.paymentReference).toBe("demo-local-payment")
        expect(order.tickets.length).toBe(1)
        expect(order.tickets[0]?.code).toContain("kraftklub-arena-berlin")

        demoCartStore.clear()
        dispose()
        resolve()
      })
    })
  })

  test("order status page state provides fixture orders for paid scenario", () => {
    createRoot((dispose) => {
      const state = demoOrderStatusPageStateCreate({ scenario: "paid" })
      expect(state.orders().length).toBeGreaterThan(0)
      expect(state.orders()[0]?.paymentStatus).toBe("paid")
      expect(state.isLoading()).toBe(false)
      dispose()
    })
  })

  test("order history page state provides populated scenario orders and auth state", () => {
    createRoot((dispose) => {
      const state = demoOrderHistoryPageStateCreate({ scenario: "populated" })
      expect(state.isAuthenticated()).toBe(true)
      expect(state.orders().length).toBeGreaterThan(0)
      dispose()
    })
  })

  test("signed-out order history scenario indicates authentication required", () => {
    createRoot((dispose) => {
      const state = demoOrderHistoryPageStateCreate({ scenario: "signed-out" })
      expect(state.isAuthenticated()).toBe(false)
      dispose()
    })
  })

  test("demo UI views do not leak non-demo internal navigation links", async () => {
    const files = [
      "src/demo/ui/DemoAdmin.tsx",
      "src/demo/ui/DemoAdminNav.tsx",
      "src/demo/ui/DemoAdminMembers.tsx",
      "src/demo/ui/DemoAdminOrganizers.tsx",
      "src/demo/ui/DemoAdminTicketOrders.tsx",
      "src/demo/ui/DemoCheckout.tsx",
      "src/demo/ui/DemoCart.tsx",
      "src/demo/ui/DemoCatalog.tsx",
      "src/demo/ui/DemoEventDetail.tsx",
      "src/demo/ui/DemoOrderStatus.tsx",
      "src/demo/ui/DemoOrders.tsx",
      "src/demo/ui/DemoOrganizerEventList.tsx",
      "src/demo/ui/DemoOrganizerEventListControls.tsx",
      "src/demo/ui/DemoOrganizerEventDetail.tsx",
    ]

    for (const file of files) {
      const content = await Bun.file(new URL(`../${file}`, import.meta.url)).text()
      // Match href or to attributes that point to internal paths that don't start with /demo or #
      const matches = content.matchAll(/(?:href|to)=["'](\/[^"']*)["']/g)
      for (const match of matches) {
        const path = match[1]!
        // Static assets/redirects like /abiball-2027.html or /images/ are allowed
        if (path.startsWith("/images") || path.endsWith(".html")) continue
        expect(path.startsWith("/demo")).toBe(true)
      }
    }
  })
})
