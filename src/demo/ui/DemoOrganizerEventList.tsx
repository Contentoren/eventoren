import { OrganizerEventListPage } from "../../organizer/OrganizerEventListPage.tsx"
import { demoFlowContextUse } from "../state/demoFlowContextUse.ts"
import { demoOrganizerEventListPageStateCreate } from "../state/demoOrganizerEventListPageStateCreate.ts"
import { DemoOrganizerEventListControls } from "./DemoOrganizerEventListControls.tsx"
import { DemoSiteFrame } from "./DemoSiteFrame.tsx"

export function DemoOrganizerEventList(props: { readonly empty: boolean }) {
  const flow = demoFlowContextUse()
  const state = demoOrganizerEventListPageStateCreate({ emptyEvents: props.empty, flow })

  return (
    <OrganizerEventListPage
      state={state}
      frame={(frameProps) => (
        <DemoSiteFrame currentId={props.empty ? "organizer-empty" : "organizer"} sessionRole="organizer">
          {frameProps.children}
        </DemoSiteFrame>
      )}
      eventHref={(eventKey) => `/demo/admin/organizer/event/${eventKey}`}
      demoControls={<DemoOrganizerEventListControls empty={props.empty} />}
    />
  )
}
