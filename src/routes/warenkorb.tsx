import { createFileRoute } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"
import { catalogEventsPublicGet } from "../server/catalogEventsPublicGet.js"
import { TicketBagPageView } from "../ticketing/TicketBagPageView.tsx"
import { ticketBagPageStateCreate } from "../ticketing/ticketBagPageStateCreate.ts"

const getCatalogEvents = createServerFn({ method: "GET" }).handler(catalogEventsPublicGet)

export const Route = createFileRoute("/warenkorb")({
  head: () => seoHeadCreate("/warenkorb"),
  loader: () => getCatalogEvents(),
  component: BagPage,
})

function BagPage() {
  const state = ticketBagPageStateCreate()

  return (
    <SiteFrame>
      <TicketBagPageView state={state} />
    </SiteFrame>
  )
}
