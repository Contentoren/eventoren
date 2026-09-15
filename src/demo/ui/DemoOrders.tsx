import { TicketOrderHistoryPage } from "../../ticketing/TicketOrderHistoryPage.tsx"
import { demoOrderHistoryPageStateCreate } from "../state/demoOrderHistoryPageStateCreate.ts"
import { DemoShell } from "./DemoShell.tsx"

export function DemoOrders(props: { readonly scenario: "populated" | "empty" | "error" | "signed-out" }) {
  const state = demoOrderHistoryPageStateCreate(props.scenario)

  return (
    <DemoShell currentId={`orders-${props.scenario}`}>
      <TicketOrderHistoryPage state={state} signInHref="/demo/auth/sign-in?returnTo=%2Fdemo%2Forders" />
    </DemoShell>
  )
}
