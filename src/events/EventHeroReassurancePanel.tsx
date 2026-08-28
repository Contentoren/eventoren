import { For } from "solid-js"
import { EventHeroAppStoreHint } from "./EventHeroAppStoreHint.tsx"
import type { EventHeroPillar } from "./EventHeroPillar.ts"
import { EventHeroPillarIcon } from "./EventHeroPillarIcon.tsx"

export function EventHeroReassurancePanel(props: { pillars: readonly EventHeroPillar[] }) {
  return (
    <aside
      class="rounded-card border border-white/20 bg-surface-inverted/70 p-space-6 backdrop-blur-md"
      aria-label="Warum Eventoren"
    >
      <p class="text-xs font-semibold uppercase tracking-widest text-white/80">Darauf kannst du zählen</p>

      <ul class="mt-space-5 flex flex-col gap-space-5">
        <For each={props.pillars}>
          {(pillar) => (
            <li class="flex items-start gap-space-4">
              <span class="flex size-11 shrink-0 items-center justify-center rounded-control bg-brand text-brand-content">
                <EventHeroPillarIcon id={pillar.id} />
              </span>
              <span class="flex flex-col gap-space-1">
                <span class="text-sm font-semibold text-content-inverted">{pillar.title}</span>
                <span class="text-sm leading-relaxed text-white/90">{pillar.description}</span>
              </span>
            </li>
          )}
        </For>
      </ul>

      <EventHeroAppStoreHint />
    </aside>
  )
}
