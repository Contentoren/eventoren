import { createFileRoute } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"
import { TicketBagEmpty } from "../ticketing/TicketBagEmpty.tsx"
import { TicketBagItemCard } from "../ticketing/TicketBagItemCard.tsx"
import { ticketBagPageStateCreate } from "../ticketing/ticketBagPageStateCreate.ts"
import { TicketBagSummary } from "../ticketing/TicketBagSummary.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { catalogEventsPublicGet } from "../server/catalogEventsPublicGet.js"

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
      <main id="content" tabindex="-1">
        <UiContainer width="wide" class="flex flex-col gap-space-7 py-space-7 sm:py-12">
          <Show when={state.catalogError()}>
            <p
              role="alert"
              class="rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3 text-sm text-danger"
            >
              {state.catalogError()}
            </p>
          </Show>
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
                <For each={state.groups()}>
                  {(group) => (
                    <section class="flex flex-col gap-space-4">
                      <h2 class="flex items-center gap-space-3 text-xl font-semibold tracking-tight text-content">
                        <Link
                          to="/events/$eventId"
                          params={{ eventId: group.event.id }}
                          class="focus-ring hover:text-brand-accent hover:underline"
                        >
                          {group.event.title}
                        </Link>
                      </h2>

                      <div class="flex flex-col gap-space-5">
                        <For each={group.items}>
                          {(item) => (
                            <TicketBagItemCard
                              event={group.event}
                              item={item}
                              eventDateLabel={group.eventDateLabel}
                              eventLocationLabel={group.eventLocationLabel}
                              onQuantityChange={(qty) => state.updateQuantity(group.event.id, item.tierId, qty)}
                              onRemove={() => state.removeItem(group.event.id, item.tierId)}
                            />
                          )}
                        </For>
                      </div>
                    </section>
                  )}
                </For>
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
