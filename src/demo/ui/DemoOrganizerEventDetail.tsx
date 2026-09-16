import { OrganizerEventDetailPage } from "../../organizer/OrganizerEventDetailPage.tsx"
import { demoOrganizerEventDetailPageStateCreate } from "../state/demoOrganizerEventDetailPageStateCreate.ts"
import { DemoOrganizerScannerSimulation } from "./DemoOrganizerScannerSimulation.tsx"
import { DemoSiteFrame } from "./DemoSiteFrame.tsx"

export function DemoOrganizerEventDetail(props: {
  readonly eventKey: () => string
  readonly initialSearch: () => string
  readonly initialTicketId: () => string
  readonly searchReplace: (search: string, ticketId: string) => void
}) {
  const state = demoOrganizerEventDetailPageStateCreate(props)

  return (
    <OrganizerEventDetailPage
      state={state}
      frame={(frameProps) => (
        <DemoSiteFrame currentId="organizer-event" sessionRole="organizer">
          {frameProps.children}
        </DemoSiteFrame>
      )}
      backHref="/demo/organizer"
      scannerSimulation={<DemoOrganizerScannerSimulation state={state} />}
    />
  )
}
