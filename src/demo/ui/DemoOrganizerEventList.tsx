import { OrganizerEventListPage } from "../../organizer/OrganizerEventListPage.tsx"
import { demoOrganizerEventListPageStateCreate } from "../state/demoOrganizerEventListPageStateCreate.ts"
import { DemoOrganizerEventListControls } from "./DemoOrganizerEventListControls.tsx"
import { DemoOrganizerFrame } from "./DemoOrganizerFrame.tsx"

export function DemoOrganizerEventList(props: { readonly empty: boolean }) {
  const state = demoOrganizerEventListPageStateCreate(props.empty)

  return (
    <OrganizerEventListPage
      state={state}
      frame={(frameProps) => (
        <DemoOrganizerFrame currentId={props.empty ? "organizer-empty" : "organizer"}>
          {frameProps.children}
        </DemoOrganizerFrame>
      )}
      eventHref={(eventKey) => `/demo/organizer/event/${eventKey}`}
      demoControls={<DemoOrganizerEventListControls empty={props.empty} />}
    />
  )
}
