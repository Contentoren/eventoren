import { For, Show } from "solid-js"
import {
  veranstalterDashboardPublicEuroFormat,
  veranstalterDashboardPublicTimeFormat,
} from "../veranstalterDashboardPublicFormat.ts"
import { veranstalterDashboardPublicEventStateCreate } from "../veranstalterDashboardPublicEventStateCreate.ts"

/** Public event page from live data: description, Berlin times, venue and live tier availability. */
export function VeranstalterDashboardPublicEventPage(p: {
  state: ReturnType<typeof veranstalterDashboardPublicEventStateCreate>
}) {
  return (
    <Show
      when={(() => {
        const data = p.state.event()
        return data && "success" in data && data.success ? data.data : undefined
      })()}
      fallback={<p class="text-sm text-content-muted">Veranstaltung wird geladen …</p>}
    >
      {(event) => (
        <section aria-labelledby="veranstalter-event" class="flex flex-col gap-4">
          <header class="flex flex-col gap-1">
            <h1 id="veranstalter-event" class="text-xl font-semibold tracking-tight text-content sm:text-2xl">
              {event().title}
            </h1>
            <p class="text-sm text-content-muted">
              {veranstalterDashboardPublicTimeFormat(event().startsAt)} · {event().venue}, {event().city}
            </p>
            <p class="text-sm">
              von{" "}
              <a href={`/veranstalter-p/${event().org.slug}`} class="underline">
                {event().org.name}
              </a>
            </p>
          </header>
          <Show when={event().subtitle}>{(subtitle) => <p class="text-sm text-content">{subtitle()}</p>}</Show>
          <Show when={event().description}>
            {(description) => <p class="max-w-2xl text-sm text-content-muted">{description()}</p>}
          </Show>
          <h2 class="font-semibold">Tickets</h2>
          <ul class="flex flex-col gap-2">
            <For each={event().tiers} fallback={<li class="text-sm text-content-muted">Derzeit keine Tickets.</li>}>
              {(tier) => (
                <li class="flex items-baseline justify-between gap-2 rounded-card border border-border-subtle bg-surface p-3">
                  <span class="font-medium">{tier.name}</span>
                  <span class="text-sm tabular-nums">
                    {veranstalterDashboardPublicEuroFormat(tier.priceCents)} ·{" "}
                    {tier.capacity - tier.sold > 0 ? `${tier.capacity - tier.sold} verfügbar` : "ausverkauft"}
                  </span>
                </li>
              )}
            </For>
          </ul>
          <p class="text-xs text-content-muted">
            Einlass {veranstalterDashboardPublicTimeFormat(event().doorsAt)} · Alle Zeiten in Europe/Berlin.
          </p>
        </section>
      )}
    </Show>
  )
}
