import type { OrganizerEventDetailPageState } from "../../organizer/OrganizerEventDetailPageState.ts"
import { organizerEventDetailPageStateCreate } from "../../organizer/organizerEventDetailPageStateCreate.ts"
import { demoOrganizerDataSourceCreate } from "../fixtures/demoOrganizerDataSourceCreate.ts"
import type { DemoFlowContextValue } from "./demoFlowContext.ts"
import { demoFlowContextUse } from "./demoFlowContextUse.ts"

export function demoOrganizerEventDetailPageStateCreate(inputs: {
  readonly eventKey: () => string
  readonly initialSearch: () => string
  readonly initialTicketId: () => string
  readonly searchReplace: (search: string, ticketId: string) => void
  readonly flow?: DemoFlowContextValue
}): OrganizerEventDetailPageState {
  const flow = inputs.flow ?? demoFlowContextUse()
  const baseState = organizerEventDetailPageStateCreate({
    ...inputs,
    dataSource: demoOrganizerDataSourceCreate(),
  })

  const hasFlow = () => flow.hasFlowStates()
  const loading = () => (hasFlow() ? flow.isLoading() : baseState.loading())
  const errorMessage = () => {
    if (hasFlow() && flow.isError()) return "Veranstalter-Details konnten nicht geladen werden."
    return baseState.errorMessage()
  }
  const tickets = () => {
    if (hasFlow() && (flow.isLoading() || flow.isEmpty() || flow.isError())) return []
    return baseState.tickets()
  }
  const event = () => {
    if (hasFlow() && (flow.isLoading() || flow.isEmpty() || flow.isError())) return undefined
    return baseState.event()
  }
  const isDone = () => {
    if (hasFlow() && flow.isEmpty()) return true
    return baseState.isDone()
  }
  const selectedTicket = () => {
    if (hasFlow() && (flow.isLoading() || flow.isEmpty() || flow.isError())) return undefined
    return baseState.selectedTicket()
  }

  return {
    ...baseState,
    event,
    tickets,
    selectedTicket,
    loading,
    isDone,
    errorMessage,
  }
}
