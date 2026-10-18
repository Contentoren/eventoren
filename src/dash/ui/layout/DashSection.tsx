import { Show } from "solid-js"
import type { JSX } from "solid-js"
import { classMerge } from "#ui/utils/classMerge.js"

export interface DashSectionProps {
  title?: string
  description?: string
  actions?: JSX.Element
  children: JSX.Element
  id?: string
  class?: string
  padded?: boolean
  footer?: JSX.Element
}

/**
 * Dashboard-Sektion: Karte mit Kopfzeile (Titel, Beschreibung, Aktionen) und Inhalt.
 * JSX-Slots (actions, footer) werden direkt eingefügt, nie in <Show> gelesen:
 * Bedingtes Lesen von JSX-Props bricht die CSR-Hydration.
 */
export function DashSection(p: DashSectionProps) {
  const hasHeadText = () => p.title !== undefined || p.description !== undefined

  return (
    <section
      id={p.id}
      aria-label={p.title}
      class={classMerge("rounded-card border border-border-subtle bg-surface", p.class)}
    >
      <Show
        when={hasHeadText()}
        fallback={
          <div class="flex justify-end px-4 pt-4 empty:hidden sm:px-5">
            <div class="flex shrink-0 flex-wrap items-center gap-2">{p.actions}</div>
          </div>
        }
      >
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle px-4 pt-4 pb-3 sm:px-5">
          <div class="min-w-0">
            <Show when={p.title}>{(title) => <h2 class="text-sm font-semibold text-content">{title()}</h2>}</Show>
            <Show when={p.description}>
              {(description) => <p class="mt-0.5 text-sm text-content-muted">{description()}</p>}
            </Show>
          </div>
          <div class="flex shrink-0 flex-wrap items-center gap-2">{p.actions}</div>
        </div>
      </Show>
      <div class={classMerge((p.padded ?? true) ? "p-4 sm:p-5" : "p-0")}>{p.children}</div>
      <div class="border-t border-border-subtle px-4 py-3 text-sm text-content-muted empty:hidden sm:px-5">
        {p.footer}
      </div>
    </section>
  )
}
