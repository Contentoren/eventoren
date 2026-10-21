export type OrganizerDashboardOrderPageScope = {
  kind: "orders" | "participants"
  userId: string
  orgId: string
  eventKey: string | null
  status: string | null
  search: string
}
