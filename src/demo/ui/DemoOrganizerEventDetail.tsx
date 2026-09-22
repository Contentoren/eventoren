import { OrganizerEventDetailPage } from "../../organizer/OrganizerEventDetailPage.tsx"
import { demoFlowContextUse } from "../state/demoFlowContextUse.ts"
import { demoOrganizerEventDetailPageStateCreate } from "../state/demoOrganizerEventDetailPageStateCreate.ts"
import { DemoOrganizerScannerSimulation } from "./DemoOrganizerScannerSimulation.tsx"
import { DemoSiteFrame } from "./DemoSiteFrame.tsx"

export function DemoOrganizerEventDetail(props: {
  readonly eventKey: () => string
  readonly initialSearch: () => string
  readonly initialTicketId: () => string
  readonly searchReplace: (search: string, ticketId: string) => void
}) {
  const flow = demoFlowContextUse()
  const state = demoOrganizerEventDetailPageStateCreate({ ...props, flow })

  return (
    <OrganizerEventDetailPage
      state={state}
      frame={(frameProps) => (
        <DemoSiteFrame currentId="organizer-event" sessionRole="organizer">
          {frameProps.children}
        </DemoSiteFrame>
      )}
      backHref="/demo/admin/organizer"
      scannerSimulation={<DemoOrganizerScannerSimulation state={state} />}
    />
  )
}
