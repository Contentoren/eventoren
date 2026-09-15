import { Link } from "@tanstack/solid-router"
import { type Accessor, For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import type { EventItem } from "../events/EventItem.ts"
import { UiContainer } from "../ui/UiContainer.tsx"
import { TicketBagEmpty } from "./TicketBagEmpty.tsx"
import type { TicketBagGroup } from "./TicketBagGroup.ts"
import { TicketBagItemCard } from "./TicketBagItemCard.tsx"
import { TicketBagSummary } from "./TicketBagSummary.tsx"

export function TicketBagPageView(props: {
  state: {
    groups: Accessor<readonly TicketBagGroup[]>
    totals: Accessor<{
      subtotalLabel: string
      feeLabel: string
      totalLabel: string
    }>
    totalQuantity: Accessor<number>
    isEmpty: Accessor<boolean>
    catalogError: Accessor<string>
    updateQuantity: (eventId: string, tierId: string, quantity: number) => void
    removeItem: (eventId: string, tierId: string) => void
    clearBag?: () => void
    checkout: () => void
  }
  eventHref?: (event: EventItem) => string
  eventsHref?: string
  showClearBag?: boolean
}) {
  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex flex-col gap-space-7 py-space-7 sm:py-12">
        <Show when={props.state.catalogError()}>
          <p
            role="alert"
            class="rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3 text-sm text-danger"
          >
            {props.state.catalogError()}
          </p>
        </Show>
        <Show
          when={!props.state.isEmpty()}
          fallback={
            <div class="flex flex-col gap-space-6">
              <TicketBagEmpty eventsHref={props.eventsHref} />
            </div>
          }
        >
          <div class="flex flex-col gap-space-3 border-b border-border-subtle pb-space-6 dark:border-border-strong/30">
            <h1 class="text-3xl font-bold tracking-tight text-content sm:text-4xl lg:text-5xl">
              Dein Warenkorb – Gesamtsumme: {props.state.totals().totalLabel}
            </h1>
            <p class="text-sm text-content-muted sm:text-base">
              Kostenlose digitale Bereitstellung und sofortiger Download in Apple & Google Wallet.
            </p>
          </div>

          <div class="grid gap-space-7 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div class="flex flex-col gap-space-5">
              <For each={props.state.groups()}>
                {(group) => (
                  <section class="flex flex-col gap-space-4">
                    <h2 class="flex items-center gap-space-3 text-xl font-semibold tracking-tight text-content">
                      <Show
                        when={props.eventHref}
                        fallback={
                          <Link
                            to="/events/$eventId"
                            params={{ eventId: group.event.id }}
                            class="focus-ring hover:text-brand-accent hover:underline"
                          >
                            {group.event.title}
                          </Link>
                        }
                      >
                        {(eventHref) => (
                          <a href={eventHref()(group.event)} class="focus-ring hover:text-brand-accent hover:underline">
                            {group.event.title}
                          </a>
                        )}
                      </Show>
                    </h2>

                    <div class="flex flex-col gap-space-5">
                      <For each={group.items}>
                        {(item) => (
                          <TicketBagItemCard
                            event={group.event}
                            item={item}
                            eventHref={props.eventHref?.(group.event)}
                            eventDateLabel={group.eventDateLabel}
                            eventLocationLabel={group.eventLocationLabel}
                            onQuantityChange={(quantity) =>
                              props.state.updateQuantity(group.event.id, item.tierId, quantity)
                            }
                            onRemove={() => props.state.removeItem(group.event.id, item.tierId)}
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
                subtotalLabel={props.state.totals().subtotalLabel}
                feeLabel={props.state.totals().feeLabel}
                totalLabel={props.state.totals().totalLabel}
                quantity={props.state.totalQuantity()}
                onCheckout={props.state.checkout}
              />
            </div>
          </div>
        </Show>
        <Show when={props.showClearBag && props.state.clearBag && !props.state.isEmpty()}>
          <Button variant="outline" size="sm" onClick={() => props.state.clearBag?.()}>
            Warenkorb leeren
          </Button>
        </Show>
      </UiContainer>
    </main>
  )
}
