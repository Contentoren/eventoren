import { EventDetailPageView } from "../../events/EventDetailPageView.tsx"
import type { EventItem } from "../../events/EventItem.ts"
import { demoEventDetailPageStateCreate } from "../state/demoEventDetailPageStateCreate.ts"
import { DemoShell } from "./DemoShell.tsx"

export function DemoEventDetail(props: { event: EventItem }) {
  const state = demoEventDetailPageStateCreate({ event: () => props.event })

  return (
    <DemoShell currentId="event-detail">
      <EventDetailPageView event={props.event} state={state} />
    </DemoShell>
  )
}
