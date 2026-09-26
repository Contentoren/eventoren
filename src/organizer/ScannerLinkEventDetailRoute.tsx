import { OrganizerEventDetailPage } from "./OrganizerEventDetailPage.tsx"
import { scannerLinkEventDetailRouteStateCreate } from "./scannerLinkEventDetailRouteStateCreate.ts"
import { scannerLinkListHrefCreate } from "./scannerLinkListHrefCreate.ts"

export function ScannerLinkEventDetailRoute(props: {
  readonly code: string
  readonly eventKey: () => string
  readonly search: () => { readonly q?: string; readonly ticket?: string }
}) {
  const state = scannerLinkEventDetailRouteStateCreate({
    code: () => props.code,
    eventKey: props.eventKey,
    search: props.search,
  })
  return <OrganizerEventDetailPage state={state} backHref={scannerLinkListHrefCreate(props.code)} allowReset={false} />
}
