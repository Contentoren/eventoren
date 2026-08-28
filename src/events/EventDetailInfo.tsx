import { For } from "solid-js"
import { UiBadge } from "../ui/UiBadge.tsx"
import { UiCard } from "../ui/UiCard.tsx"
import type { EventItem } from "./EventItem.ts"
import { eventDetailInfoStateCreate } from "./eventDetailInfoStateCreate.ts"

export function EventDetailInfo(props: { event: EventItem }) {
  const state = eventDetailInfoStateCreate({ event: () => props.event })

  return (
    <div class="flex flex-col gap-space-6">
      <section aria-labelledby="event-description">
        <h2 id="event-description" class="text-xl font-semibold text-content">
          Über das Event
        </h2>
        <p class="mt-space-4 text-base leading-relaxed text-content-muted">{props.event.description}</p>
      </section>

      <section aria-labelledby="event-facts">
        <h2 id="event-facts" class="text-xl font-semibold text-content">
          Infos & Anfahrt
        </h2>
        <UiCard class="mt-space-4">
          <dl class="flex flex-col gap-space-4">
            <For each={state.facts()}>
              {(fact) => (
                <div class="flex flex-col gap-space-1 sm:flex-row sm:items-baseline sm:gap-space-6">
                  <dt class="text-sm text-content-muted sm:w-48 sm:shrink-0">{fact.label}</dt>
                  <dd class="text-sm font-medium text-content">{fact.value}</dd>
                </div>
              )}
            </For>
          </dl>
        </UiCard>
      </section>

      <section aria-labelledby="event-tiers">
        <h2 id="event-tiers" class="text-xl font-semibold text-content">
          Ticketkategorien & Preise
        </h2>
        <ul class="mt-space-4 flex flex-col gap-space-4">
          <For each={state.tierRows()}>
            {(tier) => (
              <li>
                <UiCard>
                  <div class="flex flex-col gap-space-3 sm:flex-row sm:items-start sm:justify-between">
                    <div class="flex flex-col gap-space-2">
                      <p class="text-base font-semibold text-content">{tier.name}</p>
                      <p class="text-sm text-content-muted">{tier.description}</p>
                      <UiBadge tone={tier.soldOut ? "danger" : "success"}>{tier.availabilityLabel}</UiBadge>
                    </div>
                    <div class="sm:text-right">
                      <p class="text-lg font-semibold text-content">{tier.priceLabel}</p>
                      <p class="text-sm text-content-muted">{tier.feeLabel}</p>
                      <p class="text-sm text-content-muted">{tier.totalLabel}</p>
                    </div>
                  </div>
                </UiCard>
              </li>
            )}
          </For>
        </ul>
      </section>
    </div>
  )
}
