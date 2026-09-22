import { demoFlowStateList } from "./demoFlowStateList.ts"
import type { DemoFlowState } from "./demoFlowStateSchema.ts"

export type DemoFlowRouteCapability = {
  readonly isDataLoading: boolean
  readonly supportedStates: readonly DemoFlowState[]
  readonly defaultState: DemoFlowState
}

const staticRoutes = new Set([
  "/demo",
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
  "/demo/admin/events/new",
  "/demo/admin/events-unauthorized",
])

const legacyRouteAliases = new Map([
  ["/demo/events", "/demo/customer/events"],
  ["/demo/events-empty", "/demo/customer/events-empty"],
  ["/demo/events-error", "/demo/customer/events-error"],
  ["/demo/events-booking-success", "/demo/customer/events-booking-success"],
  ["/demo/cart", "/demo/customer/cart"],
  ["/demo/cart-empty", "/demo/customer/cart-empty"],
  ["/demo/checkout", "/demo/customer/checkout"],
  ["/demo/checkout-empty", "/demo/customer/checkout-empty"],
  ["/demo/checkout-error", "/demo/customer/checkout-error"],
  ["/demo/checkout-loading", "/demo/customer/checkout-loading"],
  ["/demo/checkout-loaded", "/demo/customer/checkout-loaded"],
  ["/demo/order-status", "/demo/customer/order-status"],
  ["/demo/order-status-pending", "/demo/customer/order-status-pending"],
  ["/demo/order-status-error", "/demo/customer/order-status-error"],
  ["/demo/orders", "/demo/customer/orders"],
  ["/demo/orders-empty", "/demo/customer/orders-empty"],
  ["/demo/orders-error", "/demo/customer/orders-error"],
  ["/demo/orders-signed-out", "/demo/customer/orders-signed-out"],
  ["/demo/admin", "/demo/admin/events"],
  ["/demo/admin-new", "/demo/admin/events/new"],
  ["/demo/admin-empty", "/demo/admin/events-empty"],
  ["/demo/admin-error", "/demo/admin/events-error"],
  ["/demo/admin-unauthorized", "/demo/admin/events-unauthorized"],
  ["/demo/admin/bestellungen", "/demo/admin/orders"],
  ["/demo/admin/mitglieder", "/demo/admin/members"],
  ["/demo/admin/veranstalter", "/demo/admin/organizers"],
  ["/demo/organizer", "/demo/admin/organizer"],
  ["/demo/organizer-empty", "/demo/admin/organizer-empty"],
])

function demoFlowRouteCanonicalizeLegacyPath(pathname: string) {
  const exact = legacyRouteAliases.get(pathname)
  if (exact) return exact
  if (pathname.startsWith("/demo/events/")) return `/demo/customer${pathname.slice("/demo".length)}`
  if (pathname.startsWith("/demo/organizer/event/")) return `/demo/admin${pathname.slice("/demo".length)}`
  return pathname
}

export function demoFlowRouteCapabilityResolve(pathname: string): DemoFlowRouteCapability {
  const trimmed = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
  const normalized = demoFlowRouteCanonicalizeLegacyPath(trimmed)

  if (!normalized.startsWith("/demo")) {
    return {
      isDataLoading: false,
      supportedStates: [],
      defaultState: "loaded",
    }
  }

  if (staticRoutes.has(normalized) || normalized.startsWith("/demo/ratgeber") || normalized.startsWith("/demo/auth")) {
    return {
      isDataLoading: false,
      supportedStates: [],
      defaultState: "loaded",
    }
  }

  let defaultState: DemoFlowState = "loaded"
  if (normalized.endsWith("-empty") || normalized.endsWith("/missing")) {
    defaultState = "empty"
  } else if (normalized.endsWith("-error")) {
    defaultState = "error"
  } else if (normalized.endsWith("-loading")) {
    defaultState = "loading"
  }

  return {
    isDataLoading: true,
    supportedStates: demoFlowStateList,
    defaultState,
  }
}
