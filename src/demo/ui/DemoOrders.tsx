import { TicketOrderHistoryPage } from "../../ticketing/TicketOrderHistoryPage.tsx"
import { demoFlowContextUse } from "../state/demoFlowContextUse.ts"
import { demoOrderHistoryPageStateCreate } from "../state/demoOrderHistoryPageStateCreate.ts"
import { DemoScenarioFrame } from "./DemoScenarioFrame.tsx"

export function DemoOrders(props: { readonly scenario: "populated" | "empty" | "error" | "signed-out" }) {
  const flow = demoFlowContextUse()
  const state = demoOrderHistoryPageStateCreate({ scenario: props.scenario, flow })

  return (
    <DemoScenarioFrame currentId={`orders-${props.scenario}`}>
      <TicketOrderHistoryPage
        state={state}
        signInHref="/demo/auth/sign-in?returnTo=%2Fdemo%2Fcustomer%2Forders"
        eventsHref="/demo/customer/events"
      />
    </DemoScenarioFrame>
  )
}
