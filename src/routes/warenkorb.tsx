import { createFileRoute } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { SiteFrame } from "../components/SiteFrame"
import { seoHeadCreate } from "../seo/seoHeadCreate"
import { TicketBagEmpty } from "../ticketing/TicketBagEmpty.tsx"
import { TicketBagItemCard } from "../ticketing/TicketBagItemCard.tsx"
import { ticketBagPageStateCreate } from "../ticketing/ticketBagPageStateCreate.ts"
import { TicketBagSummary } from "../ticketing/TicketBagSummary.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"

export const Route = createFileRoute("/warenkorb")({
  head: () => seoHeadCreate("/warenkorb"),
  component: BagPage,
})

function BagPage() {
  const state = ticketBagPageStateCreate()

  return (
    <SiteFrame>
      <main id="content" tabindex="-1">
        <UiContainer width="wide" class="flex flex-col gap-space-7 py-space-7 sm:py-12">
          {/* Apple-style Headline Banner */}
          <Show
            when={!state.isEmpty()}
            fallback={
              <div class="flex flex-col gap-space-6">
                <TicketBagEmpty />
              </div>
            }
          >
            <div class="flex flex-col gap-space-3 border-b border-border-subtle pb-space-6 dark:border-border-strong/30">
              <h1 class="text-3xl font-bold tracking-tight text-content sm:text-4xl lg:text-5xl">
                Dein Warenkorb – Gesamtsumme: {state.totals().totalLabel}
              </h1>
              <p class="text-sm text-content-muted sm:text-base">
                Kostenlose digitale Bereitstellung und sofortiger Download in Apple & Google Wallet.
              </p>
            </div>

            {/* Layout: Main Items + Sticky Summary */}
            <div class="grid gap-space-7 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
              <div class="flex flex-col gap-space-5">
                <Show when={state.event()}>
                  {(event) => (
                    <For each={state.items()}>
                      {(item) => (
                        <TicketBagItemCard
                          event={event()}
                          item={item}
                          eventDateLabel={state.eventDateLabel()}
                          eventLocationLabel={state.eventLocationLabel()}
                          onQuantityChange={(qty) => state.updateQuantity(item.tierId, qty)}
                          onRemove={() => state.removeItem(item.tierId)}
                        />
                      )}
                    </For>
                  )}
                </Show>
              </div>

              <div class="lg:sticky lg:top-24 lg:self-start">
                <TicketBagSummary
                  subtotalLabel={state.totals().subtotalLabel}
                  feeLabel={state.totals().feeLabel}
                  totalLabel={state.totals().totalLabel}
                  quantity={state.totalQuantity()}
                  onCheckout={() => state.checkout()}
                />
              </div>
            </div>
          </Show>
        </UiContainer>
      </main>
    </SiteFrame>
  )
}
