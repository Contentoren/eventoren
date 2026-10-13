import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"
import type { AdminEventDetailTab } from "./adminEventDetailSearchParse.ts"

export type AdminEventTabsProps = {
  eventKey?: string
  tab: AdminEventDetailTab
  tierCount?: number
}

export function AdminEventTabs(props: AdminEventTabsProps) {
  const base =
    "rounded-lg px-4 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring"
  const showTierWarning = () => (props.tierCount ?? 0) === 0
  const ticketProductsLabel = (
    <>
      Ticketprodukte
      <Show when={showTierWarning()}>
        <span
          title="Keine Ticketprodukte"
          class="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white leading-none"
        >
          !
        </span>
      </Show>
    </>
  )
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
          {ticketProductsLabel}
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
        {ticketProductsLabel}
      </Link>
      <Link
        to="/admin/events/$eventKey"
        params={{ eventKey: props.eventKey }}
        search={{ tab: "codes" }}
        class={`${base} ${props.tab === "codes" ? "bg-brand-soft text-content" : "text-content-muted hover:bg-surface hover:text-content"}`}
      >
        Freischaltungscode
      </Link>
      <Link
        to="/admin/events/$eventKey"
        params={{ eventKey: props.eventKey }}
        search={{ tab: "release" }}
        class={`${base} ${props.tab === "release" ? "bg-brand-soft text-content" : "text-content-muted hover:bg-surface hover:text-content"}`}
      >
        Freigabe
      </Link>
    </nav>
  )
}
