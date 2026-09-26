import { createFileRoute } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { ScannerLinkEventListRoute } from "../organizer/ScannerLinkEventListRoute.tsx"
import { scannerLinkHeadCreate } from "../organizer/scannerLinkHeadCreate.ts"

export const Route = createFileRoute("/scanner/$code")({
  head: scannerLinkHeadCreate,
  component: () => {
    const params = Route.useParams()
    return (
      <Show when={params().code} keyed>
        {(code) => <ScannerLinkEventListRoute code={code} />}
      </Show>
    )
  },
})
