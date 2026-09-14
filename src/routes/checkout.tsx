import { createFileRoute, Link } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { Show } from "solid-js"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"
import { checkoutPageStateCreate } from "../ticketing/checkoutPageStateCreate.ts"
import { TicketCheckoutForm } from "../ticketing/TicketCheckoutForm.tsx"
import { ticketCheckoutSearchParse } from "../ticketing/ticketCheckoutSearchParse.ts"
import { ticketCheckoutSearchOrderIdsParse } from "../ticketing/ticketCheckoutSearchOrderIdsParse.ts"
import { TicketOrderStatusPage } from "../ticketing/TicketOrderStatusPage.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { catalogEventsPublicGet } from "../server/catalogEventsPublicGet.js"

const getCatalogEvents = createServerFn({ method: "GET" }).handler(catalogEventsPublicGet)

export const Route = createFileRoute("/checkout")({
  head: () => seoHeadCreate("/checkout"),
  validateSearch: ticketCheckoutSearchParse,
  loader: () => getCatalogEvents(),
  component: CheckoutPage,
})

function CheckoutPage() {
  const state = checkoutPageStateCreate()
  const search = Route.useSearch()
  const orderIds = () => ticketCheckoutSearchOrderIdsParse(search().orders)
  const isStatusPage = () => orderIds().length > 0 || Boolean(search().checkout)

  if (isStatusPage()) {
    return <TicketOrderStatusPage orderIds={orderIds()} checkoutKey={search().checkout} />
  }

  return (
    <SiteFrame>
      <main id="content" tabindex="-1">
        <UiContainer class="flex flex-col gap-space-7 py-space-7">
          <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">Kasse</h1>

          <Show
            when={state.hasItems()}
            fallback={
              <div class="flex flex-col items-start gap-space-4">
                <p
                  role="alert"
                  class="rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3 text-sm font-medium text-danger"
                >
                  {state.errorMessage()}
                </p>
                <Link
                  to={state.fallbackPath()}
                  class="focus-ring rounded-control text-sm font-semibold text-brand-accent underline underline-offset-4 hover:text-content"
                >
                  {state.fallbackPath() === "/warenkorb" ? "Zum Warenkorb" : "Zurück zur Event-Übersicht"}
                </Link>
              </div>
            }
          >
            <TicketCheckoutForm items={state.items()} />
          </Show>
        </UiContainer>
      </main>
    </SiteFrame>
  )
}
