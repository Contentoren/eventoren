import { Link } from "@tanstack/solid-router"

export function AdminEventTabs(props: { eventKey?: string; tab: "details" | "products" }) {
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
          class={`${base} ${props.tab === "products" ? "bg-brand-soft text-content" : "text-content-muted hover:bg-surface hover:text-content"}`}
        >
          Ticketprodukte
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
        class={`${base} ${props.tab === "products" ? "bg-brand-soft text-content" : "text-content-muted hover:bg-surface hover:text-content"}`}
      >
        Ticketprodukte
      </Link>
    </nav>
  )
}
