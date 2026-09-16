import { useLocation } from "@tanstack/solid-router"
import type { UserRole } from "../../auth/model_field/userRole.ts"
import { ticketCartDraftTotalQuantity } from "../../ticketing/ticketCartDraftTotalQuantity.ts"
import { demoScenarioRead } from "../model/demoScenarioRead.ts"
import { demoSiteFrameStateCreate } from "./demoSiteFrameStateCreate.ts"
import { demoCartStore } from "./demoCartStore.ts"

export function demoRouteShellStateCreate() {
  const location = useLocation()
  const pathname = () => location().pathname
  const isDirectory = () => pathname() === "/demo" || pathname() === "/demo/"
  const currentId = () => {
    if (pathname().startsWith("/demo/events/")) return "event-detail"
    if (pathname().startsWith("/demo/organizer/event/")) return "organizer-event"
    return demoScenarioRead(pathname()).id
  }
  const sessionRole = (): UserRole | undefined => {
    if (pathname().startsWith("/demo/organizer")) return "organizer"
    if (pathname().startsWith("/demo/admin")) return "admin"
    return undefined
  }
  const cartQuantity = () => {
    if (pathname() === "/demo/checkout-empty") return 0
    return ticketCartDraftTotalQuantity(demoCartStore.draft())
  }
  const frame = demoSiteFrameStateCreate({ sessionRole, cartQuantity })

  return { isDirectory, currentId, frame }
}
