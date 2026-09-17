import type { TicketOrderEmailAccessPageState } from "./TicketOrderEmailAccessPageState.ts"
import { TicketOrderStatusPage } from "./TicketOrderStatusPage.tsx"

export function TicketOrderEmailAccessPage(props: { state: TicketOrderEmailAccessPageState }) {
  return <TicketOrderStatusPage orderIds={[]} state={props.state} />
}
