import { expect, test } from "bun:test"
import { rootFooterShouldRender } from "../src/marketing/rootFooterShouldRender.js"

const siteFrameRouteIds = [
  "/",
  "/agb",
  "/checkout",
  "/datenschutz",
  "/kontakt",
  "/warenkorb",
  "/events/$eventId",
  "/impressum",
  "/admin",
  "/sign-in",
  "/organizer",
  "/organizer_/event/$eventId",
  "/demo/events",
  "/demo/events-empty",
  "/demo/events-error",
  "/demo/events-booking-success",
  "/demo/events_/$eventId",
  "/demo/customer_/events",
  "/demo/customer_/events-empty",
  "/demo/customer_/events-error",
  "/demo/customer_/events-booking-success",
  "/demo/customer_/events_/$eventId",
  "/demo/customer_/cart",
  "/demo/customer_/cart-empty",
  "/demo/customer_/checkout",
  "/demo/customer_/checkout-empty",
  "/demo/customer_/checkout-error",
  "/demo/customer_/order-status",
  "/demo/customer_/order-status-pending",
  "/demo/customer_/order-status-error",
  "/demo/admin",
  "/demo/admin_/bestellungen",
  "/demo/admin_/events",
  "/demo/admin_/orders",
  "/demo/admin_/members",
  "/demo/admin_/organizers",
  "/demo/admin_/events_/new",
  "/demo/admin_/events-empty",
  "/demo/admin_/events-error",
  "/demo/admin_/events-unauthorized",
  "/demo/admin-new",
  "/demo/admin-empty",
  "/demo/admin-error",
  "/demo/admin-unauthorized",
  "/demo/contact",
  "/demo/contact-submitted",
  "/demo/navigation",
  "/demo/auth/sign-in",
  "/demo/auth/sign-in-error",
  "/demo/auth/otp",
  "/demo/auth/otp-error",
  "/demo/orders",
  "/demo/orders-empty",
  "/demo/orders-error",
  "/demo/orders-signed-out",
  "/demo/customer_/orders",
  "/demo/customer_/orders-empty",
  "/demo/customer_/orders-error",
  "/demo/customer_/orders-signed-out",
  "/demo/organizer",
  "/demo/organizer-empty",
  "/demo/organizer_/event/$eventId",
  "/demo/admin_/organizer",
  "/demo/admin_/organizer-empty",
  "/demo/admin_/organizer_/event/$eventId",
  "/demo/ratgeber",
  "/demo/ratgeber/$slug",
  "/demo/impressum",
  "/demo/datenschutz",
  "/demo/privacy",
  "/demo/agb",
  "/demo/terms",
  "/demo/abiball-2027",
] as const

test("root footer is omitted for every SiteFrame-owned route", () => {
  for (const routeId of siteFrameRouteIds) {
    expect(rootFooterShouldRender([{ routeId, status: "success" }])).toBe(false)
  }
})

test("root footer remains for root-only routes", () => {
  expect(rootFooterShouldRender([{ routeId: "/privacy", status: "success" }])).toBe(true)
  expect(rootFooterShouldRender([{ routeId: "/terms", status: "success" }])).toBe(true)
  expect(rootFooterShouldRender([{ routeId: "/bestellungen", status: "success" }])).toBe(true)
  expect(rootFooterShouldRender([{ routeId: "/ratgeber/", status: "success" }])).toBe(true)
  expect(rootFooterShouldRender([{ routeId: "/demo/", status: "success" }])).toBe(true)
})

test("root footer is omitted for the SiteFrame not-found page", () => {
  expect(rootFooterShouldRender([{ routeId: "__root__", status: "notFound" }])).toBe(false)
})
