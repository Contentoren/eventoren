import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { TicketCheckoutForm } from "../../ticketing/TicketCheckoutForm.tsx"
import { TicketOrderWalletPass } from "../../ticketing/TicketOrderWalletPass.tsx"
import { UiContainer } from "../../ui/UiContainer.tsx"
import { demoCatalogEvents } from "../fixtures/demoCatalogEvents.ts"
import { demoText } from "../model/demoText.ts"
import { demoCheckoutFormStateCreate } from "../state/demoCheckoutFormStateCreate.ts"
import { DemoSiteFrame } from "./DemoSiteFrame.tsx"

export function DemoCheckout(props: {
  readonly empty?: boolean
  readonly error?: boolean
  readonly skipForm?: boolean
}) {
  const state = demoCheckoutFormStateCreate({
    events: demoCatalogEvents,
    empty: props.empty,
    error: props.error,
    relaxedValidation: true,
    skipForm: props.skipForm,
  })
  const currentId = props.empty ? "checkout-empty" : props.error ? "checkout-error" : "checkout"

  return (
    <DemoSiteFrame currentId={currentId} cartQuantity={props.empty ? () => 0 : undefined}>
      <main id="content" tabindex="-1">
        <UiContainer class="flex flex-col gap-space-7 py-space-7">
          <Show
            when={state.completedOrders().length === 0 && (!props.skipForm || state.items().length === 0)}
            fallback={
              <div class="flex flex-col gap-space-6">
                <div class="flex flex-col gap-space-3">
                  <p class="text-sm font-semibold uppercase tracking-widest text-brand-accent">
                    {demoText("checkoutOrderEyebrow")}
                  </p>
                  <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">
                    {demoText("checkoutCompletedTitle")}
                  </h1>
                  <p class="max-w-2xl text-sm leading-relaxed text-content-muted">
                    {demoText("checkoutCompletedDescription")}
                  </p>
                </div>
                <For each={state.completedOrders()}>{(order) => <TicketOrderWalletPass order={order} />}</For>
                <div class="flex flex-wrap gap-space-3">
                  <Link
                    to="/demo/events"
                    class="focus-ring inline-flex h-11 items-center rounded-control bg-brand px-space-5 text-sm font-semibold text-brand-content"
                  >
                    {demoText("checkoutDiscoverEvents")}
                  </Link>
                  <Link
                    to="/demo/cart"
                    class="focus-ring inline-flex h-11 items-center rounded-control px-space-5 text-sm font-semibold text-content underline"
                  >
                    {demoText("checkoutCartLink")}
                  </Link>
                </div>
              </div>
            }
          >
            <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">{demoText("checkoutTitle")}</h1>
            <Show
              when={state.items().length > 0}
              fallback={
                <div class="flex flex-col items-start gap-space-4">
                  <p
                    role="alert"
                    class="rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3 text-sm font-medium text-danger"
                  >
                    {demoText("checkoutEmptyCart")}
                  </p>
                  <Link
                    to="/demo/cart"
                    class="focus-ring rounded-control text-sm font-semibold text-brand-accent underline underline-offset-4"
                  >
                    {demoText("checkoutCartLinkShort")}
                  </Link>
                </div>
              }
            >
              <TicketCheckoutForm
                items={state.items()}
                state={state}
                legalLinks={{ terms: "/demo", privacy: "/demo" }}
                paymentDescription={demoText("checkoutPaymentDescription")}
                submitLabel={demoText("checkoutSubmitLabel")}
                relaxedValidation
              />
            </Show>
          </Show>
        </UiContainer>
      </main>
    </DemoSiteFrame>
  )
}
