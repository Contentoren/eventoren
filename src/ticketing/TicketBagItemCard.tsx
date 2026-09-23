import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { imageList as serviceImageList } from "../app/assets/service/imageList.ts"
import type { EventItem } from "../events/EventItem.ts"
import { eventImageUrlGet } from "../events/eventImageUrlGet.ts"
import type { TicketBagItem } from "./TicketBagItem.ts"

export function TicketBagItemCard(props: {
  event: EventItem
  item: TicketBagItem
  eventDateLabel: string
  eventLocationLabel: string
  eventHref?: string
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}) {
  const quantityOptions = () => {
    const count = Math.max(1, props.item.maxQuantity)
    return Array.from({ length: count }, (_, i) => i + 1)
  }

  return (
    <article
      aria-label={`${props.item.tierName} für ${props.event.title}`}
      class="group relative flex flex-col gap-space-5 rounded-2xl border border-border-subtle bg-surface p-space-5 shadow-xs transition-all duration-200 hover:border-border-strong/60 sm:p-space-6 dark:border-border-strong/30"
    >
      <div class="flex flex-col gap-space-5 sm:flex-row sm:items-start sm:gap-space-6">
        {/* Event Thumbnail */}
        {props.eventHref ? (
          <a
            href={props.eventHref}
            class="focus-ring relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl border border-border-subtle/60 sm:aspect-square sm:w-28 md:w-32"
          >
            <img
              src={eventImageUrlGet(
                props.event.id === "pilates-christmas-event-2027-final"
                  ? `/${serviceImageList.pilates_card.path}`
                  : props.event.imageUrl,
              )}
              alt={
                props.event.id === "pilates-christmas-event-2027-final"
                  ? (serviceImageList.pilates_card.metadata.alt ?? props.event.imageAlt)
                  : props.event.imageAlt
              }
              loading="lazy"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </a>
        ) : (
          <Link
            to="/events/$eventId"
            params={{ eventId: props.event.id }}
            class="focus-ring relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl border border-border-subtle/60 sm:aspect-square sm:w-28 md:w-32"
          >
            <img
              src={eventImageUrlGet(
                props.event.id === "pilates-christmas-event-2027-final"
                  ? `/${serviceImageList.pilates_card.path}`
                  : props.event.imageUrl,
              )}
              alt={
                props.event.id === "pilates-christmas-event-2027-final"
                  ? (serviceImageList.pilates_card.metadata.alt ?? props.event.imageAlt)
                  : props.event.imageAlt
              }
              loading="lazy"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
        )}

        {/* Item Info */}
        <div class="flex min-w-0 flex-1 flex-col gap-space-3.5">
          <div class="flex flex-col gap-space-1">
            {props.eventHref ? (
              <a
                href={props.eventHref}
                class="focus-ring text-lg font-semibold tracking-tight text-content hover:text-brand-accent hover:underline sm:text-lg"
              >
                {props.event.title}
              </a>
            ) : (
              <Link
                to="/events/$eventId"
                params={{ eventId: props.event.id }}
                class="focus-ring text-lg font-semibold tracking-tight text-content hover:text-brand-accent hover:underline sm:text-lg"
              >
                {props.event.title}
              </Link>
            )}

            <div class="flex flex-wrap items-center gap-space-2 text-sm font-medium text-content">
              <span class="font-semibold">{props.item.tierName}</span>
              <Show when={props.item.tierDescription}>
                <span class="text-sm text-content-muted">· {props.item.tierDescription}</span>
              </Show>
            </div>
          </div>

          {/* Date & Location & Delivery */}
          <div class="mt-space-1.5 flex flex-col gap-space-2 text-sm text-content-muted">
            <div class="flex items-center gap-space-2">
              <svg viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 opacity-70" aria-hidden="true">
                <path
                  fill-rule="evenodd"
                  d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>{props.eventDateLabel}</span>
            </div>
            <div class="flex items-center gap-space-2">
              <svg viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 opacity-70" aria-hidden="true">
                <path
                  fill-rule="evenodd"
                  d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.587a14.28 14.28 0 0 0 3.032 2.199l.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>{props.eventLocationLabel}</span>
            </div>
            <div class="flex items-center gap-space-2 font-medium text-success">
              <svg viewBox="0 0 20 20" fill="currentColor" class="size-4.5 shrink-0" aria-hidden="true">
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>Sofortige digitale Bereitstellung & Apple- & Google-Wallet-Pass</span>
            </div>
          </div>

          {/* Controls: Quantity & Remove */}
          <div class="mt-space-2 flex items-center gap-space-5 border-t border-border-subtle/60 pt-space-3 dark:border-border-strong/20">
            <div class="flex items-center gap-space-4">
              <label for={`bag-qty-${props.item.tierId}`} class="text-sm font-medium text-content-muted">
                Anzahl:
              </label>
              <div class="relative">
                <select
                  id={`bag-qty-${props.item.tierId}`}
                  value={props.item.quantity}
                  ref={(element) => (element.value = String(props.item.quantity))}
                  onChange={(e) => props.onQuantityChange(Number.parseInt(e.currentTarget.value, 10))}
                  class="focus-ring h-10 appearance-none rounded-lg border border-border-strong/60 bg-surface pl-space-4 pr-9 text-sm font-semibold text-content"
                >
                  <For each={quantityOptions()}>
                    {(qty) => (
                      <option value={qty} selected={qty === props.item.quantity}>
                        {qty}
                      </option>
                    )}
                  </For>
                </select>
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  class="pointer-events-none absolute right-space-4 top-1/2 size-4 -translate-y-1/2 text-content-muted"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="m5 7.5 5 5 5-5" />
                </svg>
              </div>
            </div>

            <Button
              variant="none"
              size="none"
              type="button"
              onClick={() => props.onRemove()}
              class="focus-ring rounded text-sm font-medium text-brand-accent transition-colors hover:underline hover:text-content"
            >
              Entfernen
            </Button>
          </div>
        </div>

        {/* Price Column */}
        <div class="flex flex-col items-start sm:items-end sm:text-right">
          <span class="text-xl font-bold tracking-tight text-content sm:text-2xl">{props.item.totalPriceLabel}</span>
          <Show when={props.item.quantity > 1}>
            <span class="text-sm text-content-muted">{props.item.unitPriceLabel} pro Ticket</span>
          </Show>
        </div>
      </div>
    </article>
  )
}
