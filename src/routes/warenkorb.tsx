import { createFileRoute } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"
import { catalogEventsForCartGet } from "../server/catalogEventsForCartGet.ts"
import { TicketBagPageView } from "../ticketing/TicketBagPageView.tsx"
import { ticketBagPageStateCreate } from "../ticketing/ticketBagPageStateCreate.ts"

const getCatalogEvents = createServerFn({ method: "POST" })
  .validator((eventKeys: unknown) => {
    if (!Array.isArray(eventKeys) || eventKeys.length > 20 || !eventKeys.every((key) => typeof key === "string")) {
      throw new Error("Invalid cart event keys")
    }
    return eventKeys as string[]
  })
  .handler(({ data }) => catalogEventsForCartGet({ eventKeys: data }))

export const Route = createFileRoute("/warenkorb")({
  head: () => seoHeadCreate("/warenkorb"),
  component: BagPage,
})

function BagPage() {
  const state = ticketBagPageStateCreate({ getCatalogEvents: (eventKeys) => getCatalogEvents({ data: eventKeys }) })

  return (
    <SiteFrame>
      <TicketBagPageView state={state} />
    </SiteFrame>
  )
}
