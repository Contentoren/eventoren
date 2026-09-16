import { EventDetailPageView } from "../../events/EventDetailPageView.tsx"
import type { EventItem } from "../../events/EventItem.ts"
import { demoEventDetailPageStateCreate } from "../state/demoEventDetailPageStateCreate.ts"
import { DemoSiteFrame } from "./DemoSiteFrame.tsx"

export function DemoEventDetail(props: { event: EventItem }) {
  const state = demoEventDetailPageStateCreate({ event: () => props.event })

  return (
    <DemoSiteFrame currentId="event-detail">
      <EventDetailPageView event={props.event} state={state} />
    </DemoSiteFrame>
  )
}
