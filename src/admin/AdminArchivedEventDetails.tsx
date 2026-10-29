import { Link } from "@tanstack/solid-router"
import { For } from "solid-js"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { AdminEventItem } from "./AdminEventItem.ts"
import { adminArchivedEventDetailsStateCreate } from "./adminArchivedEventDetailsStateCreate.ts"

export function AdminArchivedEventDetails(props: { event: AdminEventItem }) {
  const state = adminArchivedEventDetailsStateCreate(() => props.event)

  return (
    <>
      <CardWrapper class="min-w-0 rounded-xl border-0 shadow-lg shadow-slate-900/10 dark:shadow-black/30">
        <p class="text-sm text-content-muted">Dieses archivierte Event ist schreibgeschützt.</p>
        <Link
          to="/admin/bestellungen"
          search={{ event: props.event.id }}
          class="mt-3 inline-block text-sm font-semibold text-brand-accent hover:underline"
        >
          Buchungen ansehen
        </Link>
        <h2 class="mt-5 text-lg font-semibold text-content">Eventdetails</h2>
        <dl class="mt-4 grid min-w-0 gap-4 text-sm sm:grid-cols-2">
          <For each={state.fields()}>
            {(field) => (
              <div class="min-w-0">
                <dt class="text-content-muted">{field.label}</dt>
                <dd class="mt-1 whitespace-pre-wrap break-words text-content">{field.value}</dd>
              </div>
            )}
          </For>
        </dl>
      </CardWrapper>
      <CardWrapper class="min-w-0 rounded-xl border-0 shadow-lg shadow-slate-900/10 dark:shadow-black/30">
        <h2 class="text-lg font-semibold text-content">Ticketprodukte</h2>
        <ul class="mt-4 grid gap-4 sm:grid-cols-2" aria-label="Archivierte Ticketprodukte">
          <For
            each={state.products()}
            fallback={<li class="text-sm text-content-muted">Keine Ticketprodukte vorhanden.</li>}
          >
            {(product) => (
              <li class="min-w-0 rounded-lg bg-surface-muted/70 p-4 dark:bg-slate-800/70">
                <h3 class="font-semibold text-content">{product.name}</h3>
                <dl class="mt-3 grid gap-3 text-sm">
                  <For each={product.fields}>
                    {(field) => (
                      <div class="min-w-0">
                        <dt class="text-content-muted">{field.label}</dt>
                        <dd class="mt-1 whitespace-pre-wrap break-words text-content">{field.value}</dd>
                      </div>
                    )}
                  </For>
                </dl>
              </li>
            )}
          </For>
        </ul>
      </CardWrapper>
    </>
  )
}
