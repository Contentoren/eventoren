import { OrganizerEventListPage } from "../../organizer/OrganizerEventListPage.tsx"
import { demoOrganizerEventListPageStateCreate } from "../state/demoOrganizerEventListPageStateCreate.ts"
import { DemoOrganizerEventListControls } from "./DemoOrganizerEventListControls.tsx"
import { DemoSiteFrame } from "./DemoSiteFrame.tsx"

export function DemoOrganizerEventList(props: { readonly empty: boolean }) {
  const state = demoOrganizerEventListPageStateCreate(props.empty)

  return (
    <OrganizerEventListPage
      state={state}
      frame={(frameProps) => (
        <DemoSiteFrame currentId={props.empty ? "organizer-empty" : "organizer"} sessionRole="organizer">
          {frameProps.children}
        </DemoSiteFrame>
      )}
      eventHref={(eventKey) => `/demo/organizer/event/${eventKey}`}
      demoControls={<DemoOrganizerEventListControls empty={props.empty} />}
    />
  )
}
