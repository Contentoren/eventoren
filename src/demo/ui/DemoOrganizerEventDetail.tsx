import { OrganizerEventDetailPage } from "../../organizer/OrganizerEventDetailPage.tsx"
import { demoOrganizerEventDetailPageStateCreate } from "../state/demoOrganizerEventDetailPageStateCreate.ts"
import { DemoOrganizerEventFrame } from "./DemoOrganizerEventFrame.tsx"
import { DemoOrganizerScannerSimulation } from "./DemoOrganizerScannerSimulation.tsx"

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
      frame={DemoOrganizerEventFrame}
      backHref="/demo/organizer"
      scannerSimulation={<DemoOrganizerScannerSimulation state={state} />}
    />
  )
}
