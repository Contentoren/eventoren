import { OrganizerEventListPage } from "./OrganizerEventListPage.tsx"
import { organizerEventListPageStateCreate } from "./organizerEventListPageStateCreate.ts"
import { scannerLinkDataSourceLiveCreate } from "./scannerLinkDataSourceLiveCreate.ts"
import { scannerLinkEventHrefCreate } from "./scannerLinkEventHrefCreate.ts"
import { ScannerHelperManagement } from "./ScannerHelperManagement.tsx"

export function ScannerLinkEventListRoute(props: { readonly code: string }) {
  const state = organizerEventListPageStateCreate({
    dataSource: scannerLinkDataSourceLiveCreate(props.code),
    linkAccess: true,
  })
  return (
    <OrganizerEventListPage
      state={state}
      eventHref={(eventKey) => scannerLinkEventHrefCreate(props.code, eventKey)}
      demoControls={<ScannerHelperManagement code={props.code} />}
    />
  )
}
