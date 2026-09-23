import { Link } from "@tanstack/solid-router"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { adminEventStatusLabel } from "./adminEventStatusLabel.ts"
import type { EventItem } from "../events/EventItem.ts"

export function AdminEventDetailHeader(props: { event?: EventItem; isNew?: boolean }) {
  return (
    <header class="flex flex-col gap-4 border-b border-border pb-5">
      <Link to="/admin/events" class="w-fit text-sm font-medium text-content-muted hover:text-content">
        ← Zurück zu Events
      </Link>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-content sm:text-3xl">
            {props.isNew ? "Neues Event" : (props.event?.title ?? "Event")}
          </h1>
        </div>
        <Badge variant="subtle">
          {props.isNew
            ? "Entwurf"
            : adminEventStatusLabel(props.event && "status" in props.event ? props.event.status : "published")}
        </Badge>
      </div>
    </header>
  )
}
