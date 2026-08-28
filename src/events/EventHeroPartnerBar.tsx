import { For } from "solid-js"
import type { EventHeroPartner } from "./EventHeroPartner.ts"

export function EventHeroPartnerBar(props: {
  organizers: readonly EventHeroPartner[]
  transports: readonly EventHeroPartner[]
}) {
  return (
    <section class="mt-space-7 border-t border-white/20 pt-space-6" aria-label="Offizielle Vertriebspartner">
      <p class="text-sm font-medium text-white/90">
        Wir sind offizieller Vertriebspartner führender Veranstalter, Spielstätten und Mobilitätsanbieter
      </p>

      <div class="mt-space-5 grid grid-cols-1 gap-space-6 md:grid-cols-2">
        <div>
          <h2 class="text-xs font-semibold uppercase tracking-widest text-white/75">Verifizierte Veranstalter</h2>
          <ul class="mt-space-3 flex flex-wrap items-center gap-space-2">
            <For each={props.organizers}>
              {(partner) => (
                <li class="inline-flex items-center gap-space-2 rounded-control bg-white/10 px-space-4 py-space-2 text-xs font-semibold tracking-wide text-white/90 ring-1 ring-inset ring-white/20">
                  <svg viewBox="0 0 20 20" aria-hidden="true" class="size-3.5 text-success" fill="currentColor">
                    <path d="M10 1.5l2.2 1.6 2.7-.2.9 2.6 2.2 1.6-1 2.5 1 2.5-2.2 1.6-.9 2.6-2.7-.2L10 18.5l-2.2-1.6-2.7.2-.9-2.6L2 12.9l1-2.5-1-2.5 2.2-1.6.9-2.6 2.7.2z" />
                    <path d="M8.9 12.4L6.4 9.9l1-1 1.5 1.5 3.7-3.7 1 1z" fill="#fff" />
                  </svg>
                  {partner.name}
                </li>
              )}
            </For>
          </ul>
        </div>

        <div>
          <h2 class="text-xs font-semibold uppercase tracking-widest text-white/75">Anreise & Transport</h2>
          <ul class="mt-space-3 flex flex-wrap items-center gap-space-2">
            <For each={props.transports}>
              {(partner) => (
                <li class="inline-flex items-center gap-space-2 rounded-control bg-white/10 px-space-4 py-space-2 text-xs font-semibold tracking-wide text-white/90 ring-1 ring-inset ring-white/20">
                  <svg viewBox="0 0 20 20" aria-hidden="true" class="size-3.5" fill="none" stroke="currentColor">
                    <rect x="5" y="3" width="10" height="11" rx="2" stroke-width="1.5" />
                    <path d="M5 9h10M7.5 17l-1.5 2M12.5 17l1.5 2" stroke-width="1.5" stroke-linecap="round" />
                    <circle cx="8" cy="12" r="0.9" fill="currentColor" stroke="none" />
                    <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
                  </svg>
                  {partner.name}
                </li>
              )}
            </For>
          </ul>
        </div>
      </div>
    </section>
  )
}
