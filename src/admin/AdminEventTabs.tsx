import { Link } from "@tanstack/solid-router"

export function AdminEventTabs(props: { eventKey?: string; tab: "details" | "products" }) {
  const base = "border-b-2 px-1 py-3 text-sm font-semibold transition-colors"
  if (!props.eventKey) {
    return (
      <nav aria-label="Eventbereiche" class="flex gap-6 border-b border-border">
        <Link
          to="/admin/events/new"
          search={{}}
          class={`${base} ${props.tab === "details" ? "border-brand text-content" : "border-transparent text-content-muted hover:text-content"}`}
        >
          Details
        </Link>
        <Link
          to="/admin/events/new"
          search={{ tab: "products" }}
          class={`${base} ${props.tab === "products" ? "border-brand text-content" : "border-transparent text-content-muted hover:text-content"}`}
        >
          Ticketprodukte
        </Link>
      </nav>
    )
  }
  return (
    <nav aria-label="Eventbereiche" class="flex gap-6 border-b border-border">
      <Link
        to="/admin/events/$eventKey"
        params={{ eventKey: props.eventKey }}
        search={{}}
        class={`${base} ${props.tab === "details" ? "border-brand text-content" : "border-transparent text-content-muted hover:text-content"}`}
      >
        Details
      </Link>
      <Link
        to="/admin/events/$eventKey"
        params={{ eventKey: props.eventKey }}
        search={{ tab: "products" }}
        class={`${base} ${props.tab === "products" ? "border-brand text-content" : "border-transparent text-content-muted hover:text-content"}`}
      >
        Ticketprodukte
      </Link>
    </nav>
  )
}
