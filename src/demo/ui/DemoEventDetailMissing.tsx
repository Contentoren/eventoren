import type { JSX } from "solid-js"
import { EventDetailUnavailableView } from "../../events/EventDetailUnavailableView.tsx"
import { DemoSiteFrame } from "./DemoSiteFrame.tsx"

export function DemoEventDetailMissing() {
  return (
    <EventDetailUnavailableView
      catalogHref="/demo/customer/events"
      frame={(frameProps: { readonly children?: JSX.Element }) => (
        <DemoSiteFrame currentId="event-detail-missing">{frameProps.children}</DemoSiteFrame>
      )}
    />
  )
}
