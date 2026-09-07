import { createFileRoute, Link } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { SiteFrame } from "../components/SiteFrame"
import { seoHeadCreate } from "../seo/seoHeadCreate"
import { checkoutPageStateCreate } from "../ticketing/checkoutPageStateCreate.ts"
import { TicketCheckoutForm } from "../ticketing/TicketCheckoutForm.tsx"
import { ticketCheckoutSearchParse } from "../ticketing/ticketCheckoutSearchParse.ts"
import { UiContainer } from "../ui/UiContainer.tsx"

export const Route = createFileRoute("/checkout")({
  head: () => seoHeadCreate("/checkout"),
  validateSearch: ticketCheckoutSearchParse,
  component: CheckoutPage,
})

function CheckoutPage() {
  const state = checkoutPageStateCreate()

  return (
    <SiteFrame>
      <main id="content" tabindex="-1">
        <UiContainer class="flex flex-col gap-space-7 py-space-7">
          <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">Kasse</h1>

          <Show
            when={state.event()}
            fallback={
              <div class="flex flex-col items-start gap-space-4">
                <p
                  role="alert"
                  class="rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3 text-sm font-medium text-danger"
                >
                  {state.errorMessage()}
                </p>
                <Link
                  to="/"
                  class="focus-ring rounded-control text-sm font-semibold text-brand-accent underline underline-offset-4 hover:text-content"
                >
                  Zurück zur Event-Übersicht
                </Link>
              </div>
            }
          >
            {(event) => <TicketCheckoutForm event={event()} cart={state.cart()} />}
          </Show>
        </UiContainer>
      </main>
    </SiteFrame>
  )
}
