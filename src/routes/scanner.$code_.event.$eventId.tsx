import { createFileRoute } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { ScannerLinkEventDetailRoute } from "../organizer/ScannerLinkEventDetailRoute.tsx"
import { organizerEventDetailSearchParse } from "../organizer/organizerEventDetailSearchParse.ts"
import { scannerLinkHeadCreate } from "../organizer/scannerLinkHeadCreate.ts"

export const Route = createFileRoute("/scanner/$code_/event/$eventId")({
  validateSearch: organizerEventDetailSearchParse,
  head: scannerLinkHeadCreate,
  component: () => {
    const params = Route.useParams()
    const search = Route.useSearch()
    return (
      <Show when={params().code} keyed>
        {(code) => <ScannerLinkEventDetailRoute code={code} eventKey={() => params().eventId} search={search} />}
      </Show>
    )
  },
})
