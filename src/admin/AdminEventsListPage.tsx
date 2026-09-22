import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { AdminEventFeedback } from "./AdminEventFeedback.tsx"
import { adminEventStatusLabel } from "./adminEventStatusLabel.ts"
import type { adminEventsListRouteStateCreate } from "./adminEventsListRouteStateCreate.ts"

const statusLabels: Record<string, string> = {
  all: "Alle Status",
  draft: "Entwurf",
  published: "Veröffentlicht",
  archived: "Archiviert",
}

export function AdminEventsListPage(props: { state: ReturnType<typeof adminEventsListRouteStateCreate> }) {
  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex flex-col gap-6 py-8">
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-widest text-brand-accent">Verwaltung</p>
            <h1 class="mt-1 text-3xl font-semibold tracking-tight text-content">Events</h1>
            <p class="mt-1 text-sm text-content-muted">{props.state.catalog.events().length} Events im Katalog</p>
          </div>
          <Link
            to="/admin/events/new"
            class="inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-content hover:bg-brand-strong"
          >
            Neues Event
          </Link>
        </header>
        <AdminEventFeedback state={props.state.catalog} />
        <CardWrapper class="p-0">
          <div class="grid gap-3 border-b border-border p-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <Input
              aria-label="Events suchen"
              placeholder="Events suchen …"
              value={props.state.query()}
              onInput={(event) => props.state.searchChange(event.currentTarget.value)}
            />
            <SelectSingleNative
              id="admin-events-status-filter"
              class="text-sm"
              valueSignal={props.state.statusSignal}
              getOptions={() => ["all", "draft", "published", "archived"]}
              valueText={(value) => statusLabels[value] ?? value}
            />
          </div>
          <Show
            when={props.state.filteredEvents().length > 0}
            fallback={<p class="p-8 text-center text-sm text-content-muted">Keine passenden Events gefunden.</p>}
          >
            <ul class="divide-y divide-border">
              <For each={props.state.filteredEvents()}>
                {(event) => (
                  <li>
                    <Link
                      to="/admin/events/$eventKey"
                      params={{ eventKey: event.id }}
                      search={{}}
                      class="grid gap-2 p-4 transition-colors hover:bg-surface-muted sm:grid-cols-[minmax(0,1fr)_14rem_10rem_7rem] sm:items-center"
                    >
                      <div class="min-w-0">
                        <p class="truncate font-semibold text-content">{event.title}</p>
                        <p class="mt-1 truncate text-xs text-content-muted">{event.organizer || event.category}</p>
                      </div>
                      <div>
                        <p class="text-sm text-content">
                          {event.startsAt
                            ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(
                                new Date(event.startsAt),
                              )
                            : "Termin offen"}
                        </p>
                      </div>
                      <p class="truncate text-sm text-content-muted">
                        {[event.venue, event.city].filter(Boolean).join(", ") || "Ort offen"}
                      </p>
                      <Badge variant="subtle" class="w-fit">
                        {adminEventStatusLabel("status" in event ? event.status : "published")}
                      </Badge>
                    </Link>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </CardWrapper>
      </UiContainer>
    </main>
  )
}
