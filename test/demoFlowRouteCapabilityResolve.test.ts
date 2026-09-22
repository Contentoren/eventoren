import { expect, test } from "bun:test"
import { demoFlowRouteCapabilityResolve } from "../src/demo/model/demoFlowRouteCapabilityResolve.ts"

test("demoFlowRouteCapabilityResolve handles standard data-loading routes", () => {
  const standardRoutes = [
    "/demo/customer/events",
    "/demo/customer/events/kraftklub-arena-berlin",
    "/demo/customer/orders",
    "/demo/customer/order-status",
    "/demo/customer/checkout",
    "/demo/customer/checkout-loaded",
    "/demo/admin/organizer",
    "/demo/admin/organizer/event/xyz",
    "/demo/admin/events",
    "/demo/admin/orders",
    "/demo/admin/members",
    "/demo/admin/organizers",
  ]

  for (const route of standardRoutes) {
    const cap = demoFlowRouteCapabilityResolve(route)
    expect(cap.isDataLoading).toBe(true)
    expect(cap.defaultState).toBe("loaded")
    expect(cap.supportedStates).toEqual(["loaded", "loading", "empty", "error"])
  }
})

test("demoFlowRouteCapabilityResolve resolves canonical empty scenario routes", () => {
  const emptyRoutes = [
    "/demo/customer/events-empty",
    "/demo/customer/events/missing",
    "/demo/customer/orders-empty",
    "/demo/customer/checkout-empty",
    "/demo/admin/organizer-empty",
    "/demo/admin/events-empty",
  ]

  for (const route of emptyRoutes) {
    const cap = demoFlowRouteCapabilityResolve(route)
    expect(cap.isDataLoading).toBe(true)
    expect(cap.defaultState).toBe("empty")
    expect(cap.supportedStates).toEqual(["loaded", "loading", "empty", "error"])
  }
})

test("demoFlowRouteCapabilityResolve resolves canonical error scenario routes", () => {
  const errorRoutes = [
    "/demo/customer/events-error",
    "/demo/customer/orders-error",
    "/demo/customer/order-status-error",
    "/demo/customer/checkout-error",
    "/demo/admin/events-error",
  ]

  for (const route of errorRoutes) {
    const cap = demoFlowRouteCapabilityResolve(route)
    expect(cap.isDataLoading).toBe(true)
    expect(cap.defaultState).toBe("error")
    expect(cap.supportedStates).toEqual(["loaded", "loading", "empty", "error"])
  }
})

test("demoFlowRouteCapabilityResolve resolves canonical loading scenario routes", () => {
  const loadingRoutes = ["/demo/customer/checkout-loading"]

  for (const route of loadingRoutes) {
    const cap = demoFlowRouteCapabilityResolve(route)
    expect(cap.isDataLoading).toBe(true)
    expect(cap.defaultState).toBe("loading")
    expect(cap.supportedStates).toEqual(["loaded", "loading", "empty", "error"])
  }
})

test("demoFlowRouteCapabilityResolve marks static/client routes as non-data-loading", () => {
  const staticRoutes = [
    "/demo",
    "/demo/",
    "/demo/customer/cart",
    "/demo/customer/cart-empty",
    "/demo/customer/orders-signed-out",
    "/demo/contact",
    "/demo/contact-submitted",
    "/demo/navigation",
    "/demo/impressum",
    "/demo/datenschutz",
    "/demo/privacy",
    "/demo/agb",
    "/demo/terms",
    "/demo/abiball-2027",
    "/demo/ratgeber",
    "/demo/ratgeber/events-sicher-planen",
    "/demo/admin/events/new",
    "/demo/admin/events-unauthorized",
    "/demo/auth/sign-in",
    "/demo/auth/sign-in-error",
    "/demo/auth/otp",
    "/non-demo",
  ]

  for (const route of staticRoutes) {
    const cap = demoFlowRouteCapabilityResolve(route)
    expect(cap.isDataLoading).toBe(false)
    expect(cap.supportedStates).toEqual([])
  }
})

test("demoFlowRouteCapabilityResolve keeps legacy redirect defaults aligned", () => {
  const aliases = [
    ["/demo/events-empty", "/demo/customer/events-empty"],
    ["/demo/checkout-loading", "/demo/customer/checkout-loading"],
    ["/demo/admin-new", "/demo/admin/events/new"],
    ["/demo/organizer/event/xyz", "/demo/admin/organizer/event/xyz"],
  ] as const

  for (const [legacyPath, canonicalPath] of aliases) {
    expect(demoFlowRouteCapabilityResolve(legacyPath)).toEqual(demoFlowRouteCapabilityResolve(canonicalPath))
  }
})
