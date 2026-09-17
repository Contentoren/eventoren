import { createFileRoute } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { Show } from "solid-js"
import { envBaseUrlAppResult } from "#src/app/env/public/envBaseUrlAppResult.ts"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"
import { checkoutPageStateCreate } from "../ticketing/checkoutPageStateCreate.ts"
import { TicketCheckoutEmptyState } from "../ticketing/TicketCheckoutEmptyState.tsx"
import { TicketCheckoutForm } from "../ticketing/TicketCheckoutForm.tsx"
import { TicketOrderStatusPage } from "../ticketing/TicketOrderStatusPage.tsx"
import { ticketCheckoutFormStateCreate } from "../ticketing/ticketCheckoutFormStateCreate.ts"
import { ticketCheckoutSearchOrderIdsParse } from "../ticketing/ticketCheckoutSearchOrderIdsParse.ts"
import { ticketCheckoutSearchParse } from "../ticketing/ticketCheckoutSearchParse.ts"
import { ticketCheckoutText } from "../ticketing/ticketCheckoutText.ts"
import { UiContainer } from "../ui/UiContainer.tsx"
import { catalogEventsPublicGet } from "../server/catalogEventsPublicGet.js"

const getCatalogEvents = createServerFn({ method: "GET" }).handler(catalogEventsPublicGet)
const getAppOrigin = createServerFn({ method: "GET" }).handler(() => envBaseUrlAppResult())

export const Route = createFileRoute("/checkout")({
  head: () => seoHeadCreate("/checkout"),
  validateSearch: ticketCheckoutSearchParse,
  loader: async () => {
    const [catalog, appOrigin] = await Promise.all([getCatalogEvents(), getAppOrigin()])
    return { catalog, appOrigin }
  },
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

  return <CheckoutFormPage state={state} />
}

function CheckoutFormPage(props: { state: ReturnType<typeof checkoutPageStateCreate> }) {
  const loaderData = Route.useLoaderData()
  const formState = ticketCheckoutFormStateCreate({ items: props.state.items, appOrigin: () => loaderData().appOrigin })
  const text = ticketCheckoutText
  return (
    <SiteFrame>
      <main id="content" tabindex="-1">
        <UiContainer class="flex flex-col gap-space-7 py-space-7">
          <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">{text().title}</h1>

          <Show
            when={props.state.hasItems()}
            fallback={
              <TicketCheckoutEmptyState
                title={text().checkoutUnavailable}
                message={props.state.errorMessage()}
                fallbackPath={props.state.fallbackPath()}
                returnLabel={props.state.fallbackPath() === "/warenkorb" ? text().backToCart : text().backToEvents}
              />
            }
          >
            <TicketCheckoutForm items={props.state.items()} state={formState} />
          </Show>
        </UiContainer>
      </main>
    </SiteFrame>
  )
}
