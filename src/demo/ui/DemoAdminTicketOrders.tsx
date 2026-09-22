import { AdminTicketOrdersPage } from "../../admin/AdminTicketOrdersPage.tsx"
import { demoAdminTicketOrdersPageStateCreate } from "../state/demoAdminTicketOrdersPageStateCreate.ts"
import { DemoAdminNav } from "./DemoAdminNav.tsx"
import { DemoScenarioFrame } from "./DemoScenarioFrame.tsx"

export function DemoAdminTicketOrders() {
  const state = demoAdminTicketOrdersPageStateCreate()

  return (
    <DemoScenarioFrame currentId="admin-orders">
      <AdminTicketOrdersPage state={state} headerSlot={<DemoAdminNav />} />
    </DemoScenarioFrame>
  )
}
