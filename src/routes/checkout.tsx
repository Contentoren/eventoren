import { createFileRoute } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { Show } from "solid-js"
import { createResult } from "#result"
import { envBaseUrlAppResult } from "#src/app/env/public/envBaseUrlAppResult.ts"
import { envCheckoutBillingBypassEnabled } from "#src/app/env/public/envCheckoutBillingBypassEnabled.ts"
import { envCheckoutFormBypassEnabled } from "#src/app/env/public/envCheckoutFormBypassEnabled.ts"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { DemoCheckout } from "../demo/ui/DemoCheckout.tsx"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"
import { catalogEventsForCartGet } from "../server/catalogEventsForCartGet.ts"
import { checkoutPageStateCreate } from "../ticketing/checkoutPageStateCreate.ts"
import { TicketCheckoutEmptyState } from "../ticketing/TicketCheckoutEmptyState.tsx"
import { TicketCheckoutForm } from "../ticketing/TicketCheckoutForm.tsx"
import { TicketOrderEmailAccessPage } from "../ticketing/TicketOrderEmailAccessPage.tsx"
import { TicketOrderStatusPage } from "../ticketing/TicketOrderStatusPage.tsx"
import { ticketCheckoutFormStateCreate } from "../ticketing/ticketCheckoutFormStateCreate.ts"
import { ticketCheckoutSearchOrderIdsParse } from "../ticketing/ticketCheckoutSearchOrderIdsParse.ts"
import { ticketCheckoutSearchParse } from "../ticketing/ticketCheckoutSearchParse.ts"
import { ticketCheckoutText } from "../ticketing/ticketCheckoutText.ts"
import { ticketOrderEmailAccessPageStateCreate } from "../ticketing/ticketOrderEmailAccessPageStateCreate.ts"
import { UiContainer } from "../ui/UiContainer.tsx"

const getCatalogEvents = createServerFn({ method: "POST" })
  .validator((eventKeys: unknown) => {
    if (!Array.isArray(eventKeys) || eventKeys.length > 20 || !eventKeys.every((key) => typeof key === "string")) {
      throw new Error("Invalid cart event keys")
    }
    return eventKeys as string[]
  })
  .handler(({ data }) => catalogEventsForCartGet({ eventKeys: data }))
const getAppOrigin = createServerFn({ method: "GET" }).handler(() => envBaseUrlAppResult())

export const Route = createFileRoute("/checkout")({
  head: () => {
    const head = seoHeadCreate("/checkout")
    return { ...head, meta: [...head.meta, { name: "referrer", content: "no-referrer" }] }
  },
  validateSearch: ticketCheckoutSearchParse,
  loader: async () => {
    if (envCheckoutBillingBypassEnabled())
      return {
        bypassBilling: true as const,
        skipCheckoutForm: envCheckoutFormBypassEnabled(),
        appOrigin: createResult(""),
      }
    const appOrigin = await getAppOrigin()
    return { bypassBilling: false as const, skipCheckoutForm: false as const, appOrigin }
  },
  component: CheckoutPage,
})

function CheckoutPage() {
  const emailAccessState = ticketOrderEmailAccessPageStateCreate()
  const search = Route.useSearch()
  const loaderData = Route.useLoaderData()
  const orderIds = () => ticketCheckoutSearchOrderIdsParse(search().orders)
  const isStatusPage = () => orderIds().length > 0 || Boolean(search().checkout)

  return (
    <Show
      when={emailAccessState.isActive()}
      fallback={
        <Show
          when={isStatusPage()}
          fallback={
            <Show when={loaderData().bypassBilling} fallback={<CheckoutFormPage appOrigin={loaderData().appOrigin} />}>
              <DemoCheckout skipForm={loaderData().skipCheckoutForm} />
            </Show>
          }
        >
          <SiteFrame>
            <TicketOrderStatusPage orderIds={orderIds()} checkoutKey={search().checkout} />
          </SiteFrame>
        </Show>
      }
    >
      <SiteFrame>
        <TicketOrderEmailAccessPage state={emailAccessState} />
      </SiteFrame>
    </Show>
  )
}

function CheckoutFormPage(props: { appOrigin: ReturnType<typeof envBaseUrlAppResult> }) {
  const state = checkoutPageStateCreate({ getCatalogEvents: (eventKeys) => getCatalogEvents({ data: eventKeys }) })
  const formState = ticketCheckoutFormStateCreate({ items: state.items, appOrigin: () => props.appOrigin })
  const text = ticketCheckoutText
  return (
    <SiteFrame>
      <main id="content" tabindex="-1">
        <UiContainer class="flex flex-col gap-space-7 py-space-7">
          <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">{text().title}</h1>

          <Show when={state.isReady()}>
            <Show
              when={state.hasItems()}
              fallback={
                <TicketCheckoutEmptyState
                  title={text().checkoutUnavailable}
                  message={state.errorMessage()}
                  fallbackPath={state.fallbackPath()}
                  returnLabel={state.fallbackPath() === "/warenkorb" ? text().backToCart : text().backToEvents}
                />
              }
            >
              <TicketCheckoutForm items={state.items()} state={formState} />
            </Show>
          </Show>
        </UiContainer>
      </main>
    </SiteFrame>
  )
}
