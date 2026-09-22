import { TicketOrderStatusPage } from "../../ticketing/TicketOrderStatusPage.tsx"
import { demoFlowContextUse } from "../state/demoFlowContextUse.ts"
import { demoOrderStatusPageStateCreate } from "../state/demoOrderStatusPageStateCreate.ts"
import { DemoScenarioFrame } from "./DemoScenarioFrame.tsx"

export function DemoOrderStatus(props: { readonly scenario: "paid" | "pending" | "error" }) {
  const flow = demoFlowContextUse()
  const state = demoOrderStatusPageStateCreate({ scenario: props.scenario, flow })

  return (
    <DemoScenarioFrame currentId={`order-status-${props.scenario}`}>
      <TicketOrderStatusPage
        orderIds={[]}
        state={state}
        cartHref="/demo/customer/cart"
        eventsHref="/demo/customer/events"
        ordersHref="/demo/customer/orders"
      />
    </DemoScenarioFrame>
  )
}
