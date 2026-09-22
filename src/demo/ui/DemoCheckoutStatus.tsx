import { TicketOrderStatusPage } from "../../ticketing/TicketOrderStatusPage.tsx"
import { demoCheckoutStatusPageStateCreate } from "../state/demoCheckoutStatusPageStateCreate.ts"
import { demoFlowContextUse } from "../state/demoFlowContextUse.ts"
import { DemoScenarioFrame } from "./DemoScenarioFrame.tsx"

export function DemoCheckoutStatus(props: { readonly scenario: "loading" | "loaded" }) {
  const flow = demoFlowContextUse()
  const state = demoCheckoutStatusPageStateCreate({ scenario: props.scenario, flow })

  return (
    <DemoScenarioFrame currentId={`checkout-${props.scenario}`}>
      <TicketOrderStatusPage orderIds={[]} state={state} cartHref="/demo/customer/cart" hideRefreshingMessage />
    </DemoScenarioFrame>
  )
}
