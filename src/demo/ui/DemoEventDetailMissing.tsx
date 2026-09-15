import type { JSX } from "solid-js"
import { EventDetailUnavailableView } from "../../events/EventDetailUnavailableView.tsx"
import { DemoShell } from "./DemoShell.tsx"

export function DemoEventDetailMissing() {
  return (
    <EventDetailUnavailableView
      frame={(frameProps: { readonly children?: JSX.Element }) => (
        <DemoShell currentId="event-detail-missing">{frameProps.children}</DemoShell>
      )}
    />
  )
}
