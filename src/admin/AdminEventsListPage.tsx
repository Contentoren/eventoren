import { mdiDelete } from "@adaptive-ds/mdi/mdiDelete.js"
import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { SelectSingle } from "#ui/input/select/SelectSingle.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { adminListViewPreferenceContextUse } from "../viewPreference/adminListViewPreferenceContextUse.ts"
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
  const viewPreference = adminListViewPreferenceContextUse()

  const eventDetails = (event: ReturnType<typeof props.state.filteredEvents>[number]) => (
    <>
      <div class="min-w-0">
        <p class="truncate font-semibold text-content">{event.title}</p>
        <p class="mt-1 truncate text-xs text-content-muted">Veranstalter: {event.organizer || "Nicht angegeben"}</p>
        <p class="truncate text-xs text-content-muted">Kategorie: {event.category || "Nicht angegeben"}</p>
      </div>
      <p class="text-sm text-content">
        <span class="text-content-muted">Datum: </span>
        {event.startsAt
          ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(event.startsAt),
            )
          : "Termin offen"}
      </p>
      <p class="truncate text-sm text-content-muted">
        Ort: {[event.venue, event.city].filter(Boolean).join(", ") || "Ort offen"}
      </p>
      <div class="flex flex-wrap items-center gap-1">
        <span class="text-sm text-content-muted">Status:</span>
        <Badge variant="subtle" class="w-fit">
          {adminEventStatusLabel("status" in event ? event.status : "published")}
        </Badge>
      </div>
    </>
  )

  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex flex-col gap-6 py-8">
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-content">Events</h1>
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
        <div>
          <div class="grid gap-3 border-b border-border p-4 sm:grid-cols-[minmax(0,1fr)_14rem_12rem]">
            <Input
              aria-label="Events suchen"
              placeholder="Events suchen …"
              value={props.state.query()}
              onInput={(event) => props.state.searchChange(event.currentTarget.value)}
            />
            <SelectSingle
              class="min-w-0"
              buttonProps={{ class: "w-full min-w-0 justify-start truncate", innerClass: "min-w-64", type: "button" }}
              valueSignal={props.state.eventSignal}
              getOptions={props.state.eventOptions}
              valueText={props.state.eventText}
              renderItem={props.state.eventText}
              searchPlaceholder="Event suchen …"
              texts={{ selectEntry: "Alle Events", noEntries: "Keine Events gefunden" }}
              innerClass="flex flex-col"
              listOptionClass="w-full"
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
            <ul
              class={
                viewPreference?.view() === "tiles"
                  ? "grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3"
                  : "divide-y divide-border"
              }
            >
              <For each={props.state.filteredEvents()}>
                {(event) => (
                  <li>
                    <Show
                      when={viewPreference?.view() === "tiles"}
                      fallback={
                        <div class="flex items-center gap-2 pr-4 hover:bg-surface-muted">
                          <Link
                            to="/admin/events/$eventKey"
                            params={{ eventKey: event.id }}
                            search={{}}
                            class="grid min-w-0 flex-1 gap-2 p-4 transition-colors sm:grid-cols-[minmax(0,1fr)_14rem_10rem_7rem] sm:items-center"
                          >
                            {eventDetails(event)}
                          </Link>
                          <ButtonIconOnly
                            type="button"
                            variant="none"
                            icon={mdiDelete}
                            iconClass="group-hover:text-red-400"
                            title={`Event ${event.title} löschen`}
                            class="text-content-muted"
                            disabled={props.state.catalog.isSaving()}
                            onClick={() => props.state.deleteEvent(event.id, event.title)}
                            aria-label={`Event ${event.title} löschen`}
                          />
                        </div>
                      }
                    >
                      <CardWrapper class="relative h-full p-0">
                        <Link
                          to="/admin/events/$eventKey"
                          params={{ eventKey: event.id }}
                          search={{}}
                          class="grid h-full gap-3 p-4 pr-14 transition-colors hover:bg-surface-muted"
                        >
                          {eventDetails(event)}
                        </Link>
                        <ButtonIconOnly
                          type="button"
                          variant="none"
                          icon={mdiDelete}
                          iconClass="group-hover:text-red-400"
                          title={`Event ${event.title} löschen`}
                          class="absolute right-3 top-3 text-content-muted"
                          disabled={props.state.catalog.isSaving()}
                          onClick={() => props.state.deleteEvent(event.id, event.title)}
                          aria-label={`Event ${event.title} löschen`}
                        />
                      </CardWrapper>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>
      </UiContainer>
    </main>
  )
}
