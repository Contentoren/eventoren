import { useNavigate } from "@tanstack/solid-router"
import { adminEventsRouteStateCreate } from "./adminEventsRouteStateCreate.ts"

export function adminEventNewRouteStateCreate() {
  const catalog = adminEventsRouteStateCreate()
  const navigate = useNavigate()
  catalog.startNewEvent()
  return {
    catalog,
    eventSaved: (eventKey: string) =>
      void navigate({ to: "/admin/events/$eventKey", params: { eventKey }, search: {}, replace: true }),
  }
}
