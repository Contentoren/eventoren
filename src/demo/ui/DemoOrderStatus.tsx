import { TicketOrderStatusPage } from "../../ticketing/TicketOrderStatusPage.tsx"
import { demoOrderStatusPageStateCreate } from "../state/demoOrderStatusPageStateCreate.ts"
import { DemoScenarioFrame } from "./DemoScenarioFrame.tsx"

export function DemoOrderStatus(props: { readonly scenario: "paid" | "pending" | "error" }) {
  const state = demoOrderStatusPageStateCreate(props.scenario)

  return (
    <DemoScenarioFrame currentId={`order-status-${props.scenario}`}>
      <TicketOrderStatusPage orderIds={[]} state={state} cartHref="/demo/cart" />
    </DemoScenarioFrame>
  )
}
