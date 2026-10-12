import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"

export function AdminEventTabs(props: { eventKey?: string; tab: "details" | "products"; tierCount?: number }) {
  const base =
    "rounded-lg px-4 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring"
  if (!props.eventKey) {
    return (
      <nav
        aria-label="Eventbereiche"
        class="flex flex-wrap gap-2 rounded-xl bg-surface-muted/60 p-1 dark:bg-slate-800/60"
      >
        <Link
          to="/admin/events/new"
          search={{}}
          class={`${base} ${props.tab === "details" ? "bg-brand-soft text-content" : "text-content-muted hover:bg-surface hover:text-content"}`}
        >
          Details
        </Link>
        <Link
          to="/admin/events/new"
          search={{ tab: "products" }}
          class={`${base} inline-flex items-center gap-1.5 ${props.tab === "products" ? "bg-brand-soft text-content" : "text-content-muted hover:bg-surface hover:text-content"}`}
        >
          <span>Ticketprodukte</span>
          <Show when={(props.tierCount ?? 0) === 0}>
            <span
              class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white leading-none"
              title="Keine Ticketprodukte"
            >
              !
            </span>
          </Show>
        </Link>
      </nav>
    )
  }
  return (
    <nav
      aria-label="Eventbereiche"
      class="flex flex-wrap gap-2 rounded-xl bg-surface-muted/60 p-1 dark:bg-slate-800/60"
    >
      <Link
        to="/admin/events/$eventKey"
        params={{ eventKey: props.eventKey }}
        search={{}}
        class={`${base} ${props.tab === "details" ? "bg-brand-soft text-content" : "text-content-muted hover:bg-surface hover:text-content"}`}
      >
        Details
      </Link>
      <Link
        to="/admin/events/$eventKey"
        params={{ eventKey: props.eventKey }}
        search={{ tab: "products" }}
        class={`${base} inline-flex items-center gap-1.5 ${props.tab === "products" ? "bg-brand-soft text-content" : "text-content-muted hover:bg-surface hover:text-content"}`}
      >
        <span>Ticketprodukte</span>
        <Show when={(props.tierCount ?? 0) === 0}>
          <span
            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white leading-none"
            title="Keine Ticketprodukte"
          >
            !
          </span>
        </Show>
      </Link>
    </nav>
  )
}
