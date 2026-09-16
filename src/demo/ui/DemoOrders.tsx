import { TicketOrderHistoryPage } from "../../ticketing/TicketOrderHistoryPage.tsx"
import { demoOrderHistoryPageStateCreate } from "../state/demoOrderHistoryPageStateCreate.ts"
import { DemoScenarioFrame } from "./DemoScenarioFrame.tsx"

export function DemoOrders(props: { readonly scenario: "populated" | "empty" | "error" | "signed-out" }) {
  const state = demoOrderHistoryPageStateCreate(props.scenario)

  return (
    <DemoScenarioFrame currentId={`orders-${props.scenario}`}>
      <TicketOrderHistoryPage state={state} signInHref="/demo/auth/sign-in?returnTo=%2Fdemo%2Forders" />
    </DemoScenarioFrame>
  )
}
