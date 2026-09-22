import { createMemo } from "solid-js"
import type { OrganizerEventListPageState } from "../../organizer/OrganizerEventListPageState.ts"
import { organizerEventsGroup } from "../../organizer/organizerEventsGroup.ts"
import { organizerTextGet } from "../../organizer/organizerTextGet.ts"
import { demoOrganizerEvents } from "../fixtures/demoOrganizerEvents.ts"
import type { DemoFlowContextValue } from "./demoFlowContext.ts"
import { demoFlowContextUse } from "./demoFlowContextUse.ts"

export function demoOrganizerEventListPageStateCreate(
  inputs?:
    | boolean
    | {
        emptyEvents?: boolean
        flow?: DemoFlowContextValue
      },
): OrganizerEventListPageState {
  const emptyEvents = typeof inputs === "boolean" ? inputs : Boolean(inputs?.emptyEvents)
  const flow = typeof inputs === "object" && inputs?.flow ? inputs.flow : demoFlowContextUse()

  const text = createMemo(organizerTextGet)

  const hasFlow = () => flow.hasFlowStates()
  const loading = () => (hasFlow() ? flow.isLoading() : false)
  const isError = () => (hasFlow() ? flow.isError() : false)
  const isEmpty = () => (hasFlow() ? flow.isEmpty() : emptyEvents)

  const groups = () => {
    if (loading() || isError() || isEmpty()) return []
    return organizerEventsGroup(demoOrganizerEvents)
  }

  const errorMessage = () => {
    if (isError()) return "Veranstalter-Events konnten nicht geladen werden."
    return ""
  }

  const eventTime = (value: string) =>
    new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))

  return { groups, text, loading, errorMessage, eventTime }
}
