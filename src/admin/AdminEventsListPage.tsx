import { mdiArchiveOutline } from "@adaptive-ds/mdi/mdiArchiveOutline.js"
import { mdiArrowLeft } from "@adaptive-ds/mdi/mdiArrowLeft.js"
import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { SelectSingle } from "#ui/input/select/SelectSingle.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { AdminEventFeedback } from "./AdminEventFeedback.tsx"
import { AdminEventOverviewPanel } from "./AdminEventOverviewPanel.tsx"
import { adminEventStatusLabel } from "./adminEventStatusLabel.ts"
import type { adminEventsListRouteStateCreate } from "./adminEventsListRouteStateCreate.ts"

const statusLabels: Record<string, string> = {
  all: "Alle Status",
  draft: "Entwurf",
  published: "Veröffentlicht",
  archived: "Archiviert",
}

export function AdminEventsListPage(props: { state: ReturnType<typeof adminEventsListRouteStateCreate> }) {
  const eventDetails = (event: ReturnType<typeof props.state.filteredEvents>[number], tile: boolean) => (
    <>
      <div class="min-w-0">
        <p class={`truncate font-semibold text-content ${tile ? "pr-24" : ""}`}>{event.title}</p>
        <Show when={tile}>
          <p class="mt-1 truncate text-xs text-content-muted">Veranstalter: {event.organizer || "Nicht angegeben"}</p>
          <p class="truncate text-xs text-content-muted">Kategorie: {event.category || "Nicht angegeben"}</p>
        </Show>
      </div>
      <Show when={!tile}>
        <p class="min-w-0 truncate text-sm text-content-muted">
          <span class="xl:hidden">Veranstalter: </span>
          {event.organizer || "Nicht angegeben"}
        </p>
        <p class="min-w-0 truncate text-sm text-content-muted">
          <span class="xl:hidden">Kategorie: </span>
          {event.category || "Nicht angegeben"}
        </p>
      </Show>
      <p class="min-w-0 text-sm text-content">
        <span class={tile ? "text-content-muted" : "text-content-muted xl:hidden"}>Datum: </span>
        {event.startsAt
          ? new Intl.DateTimeFormat("de-DE", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Europe/Berlin",
            }).format(new Date(event.startsAt))
          : "Termin offen"}
      </p>
      <p class="min-w-0 truncate text-sm text-content-muted">
        <span class={tile ? "" : "xl:hidden"}>Ort: </span>
        {[event.venue, event.city].filter(Boolean).join(", ") || "Ort offen"}
      </p>
      <div
        class={tile ? "absolute right-3 top-3 flex flex-wrap items-center gap-1" : "flex flex-wrap items-center gap-1"}
      >
        <Show when={!tile}>
          <span class="text-sm text-content-muted xl:hidden">Status:</span>
        </Show>
        <Badge variant="subtle" class="w-fit border-0">
          {adminEventStatusLabel("status" in event ? event.status : "published")}
        </Badge>
        <Show when={event.tiers.length === 0}>
          <Badge variant="filledYellow" class="w-fit border-0 whitespace-nowrap">
            Keine Ticketprodukte
          </Badge>
        </Show>
      </div>
    </>
  )

  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex flex-col gap-6 py-6 sm:py-8">
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-content">
              {props.state.archiveMode() ? "Event-Archiv" : "Events"}
            </h1>
            <Show
              when={!props.state.catalog.errorMessage() && !(props.state.catalog.eventsError?.() ?? "")}
              fallback={
                <p class="mt-1 text-sm text-content-muted">Admin-Veranstaltungen konnten nicht geladen werden.</p>
              }
            >
              <Show
                when={!props.state.catalog.isLoading?.()}
                fallback={<p class="mt-1 text-sm text-content-muted">Events werden geladen …</p>}
              >
                <p class="mt-1 text-sm text-content-muted">{props.state.catalog.events().length} Events im Katalog</p>
              </Show>
            </Show>
          </div>
          <div class="ml-auto flex max-w-full shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="size-11 shrink-0 p-2"
              title={props.state.archiveLabel()}
              aria-label={props.state.archiveLabel()}
              aria-pressed={props.state.archiveMode()}
              onClick={props.state.archiveToggle}
            >
              <Icon path={props.state.archiveMode() ? mdiArrowLeft : mdiArchiveOutline} class="size-5" />
            </Button>
            <Link
              to="/admin/events/new"
              class="inline-flex min-h-11 items-center whitespace-nowrap rounded-md bg-brand px-4 py-2 text-sm font-semibold text-brand-content hover:bg-brand-strong"
            >
              Neues Event
            </Link>
          </div>
        </header>
        <AdminEventFeedback state={props.state.catalog} />
        <div class="min-w-0 overflow-hidden rounded-xl bg-surface shadow-lg shadow-slate-900/10 dark:shadow-black/30">
          <div class="grid gap-3 bg-surface-muted/60 p-4 dark:bg-slate-800/60 lg:grid-cols-[minmax(0,1fr)_auto_12rem]">
            <Input
              aria-label="Events suchen"
              placeholder="Events suchen …"
              class="min-h-11 rounded-lg border-0 bg-surface shadow-sm shadow-slate-900/5 dark:bg-slate-900/80 dark:shadow-black/20"
              value={props.state.query()}
              onInput={(event) => props.state.searchChange(event.currentTarget.value)}
            />
            <div class="flex flex-wrap items-center gap-3">
              <SelectSingle
                class="min-w-0 max-w-40"
                buttonProps={{
                  variant: "none",
                  size: "none",
                  class:
                    "min-h-11 max-w-40 min-w-0 justify-start truncate rounded-lg border-0 bg-surface px-2.5 py-2 text-sm text-content shadow-sm shadow-slate-900/5 dark:bg-slate-900/80 dark:shadow-black/20 focus-visible:ring-2 focus-visible:ring-ring",
                  innerClass: "min-w-64",
                  type: "button",
                }}
                valueSignal={props.state.eventSignal}
                getOptions={props.state.eventOptions}
                valueText={props.state.eventText}
                renderItem={props.state.eventText}
                searchPlaceholder="Event suchen …"
                texts={{ selectEntry: "Alle Events", noEntries: "Keine Events gefunden" }}
                innerClass="flex flex-col"
                listOptionClass="w-full"
              />
            </div>
            <div class="relative">
              <SelectSingleNative
                id="admin-events-status-filter"
                class="min-h-11 appearance-none border-0! bg-surface pr-10 text-sm shadow-sm shadow-slate-900/5 focus-visible:ring-2 focus-visible:ring-ring dark:bg-slate-900/80 dark:shadow-black/20"
                valueSignal={props.state.statusSignal}
                getOptions={() => ["all", "draft", "published", "archived"]}
                valueText={(value) => statusLabels[value] ?? value}
              />
              <svg
                class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-content-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <Show
            when={props.state.filteredEvents().length > 0}
            fallback={
              <Show
                when={props.state.catalog.eventsError?.()}
                fallback={
                  <Show
                    when={props.state.catalog.isLoading?.()}
                    fallback={
                      <p class="p-8 text-center text-sm text-content-muted">Keine passenden Events gefunden.</p>
                    }
                  >
                    <p class="p-8 text-center text-sm text-content-muted">Events werden geladen …</p>
                  </Show>
                }
              >
                <p class="p-8 text-center text-sm text-content-muted">
                  Admin-Veranstaltungen konnten nicht geladen werden.
                </p>
              </Show>
            }
          >
            <Show when={!props.state.tiles()}>
              <div class="hidden items-center bg-surface-muted/40 text-xs font-semibold text-content-muted dark:bg-slate-800/40 xl:flex">
                <div class="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,9rem)_minmax(0,8rem)_minmax(0,11rem)_minmax(0,10rem)_7rem] gap-2 px-4 py-3">
                  <span>Event</span>
                  <span>Veranstalter</span>
                  <span>Kategorie</span>
                  <span>Datum</span>
                  <span>Ort</span>
                  <span>Status</span>
                </div>
              </div>
            </Show>
            <ul class={props.state.tiles() ? "grid items-start gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3" : ""}>
              <For each={props.state.filteredEvents()}>
                {(event) => (
                  <li
                    class={
                      props.state.tiles() ? "min-w-0" : "min-w-0 even:bg-surface-muted/35 dark:even:bg-slate-800/30"
                    }
                  >
                    <Show
                      when={props.state.tiles()}
                      fallback={
                        <div class="flex items-center hover:bg-surface-muted/60">
                          <Button
                            type="button"
                            variant="none"
                            size="none"
                            aria-expanded={props.state.overviewExpanded(event.id)}
                            aria-controls={props.state.overview.panelId(event.id)}
                            aria-label={`Übersicht für ${event.title}`}
                            onClick={() => props.state.overviewToggle(event.id)}
                            class="grid min-w-0 flex-1 cursor-pointer items-start justify-stretch gap-2 rounded-none p-4 text-left font-normal transition-colors active:scale-100 focus-visible:outline-2 focus-visible:outline-ring xl:grid-cols-[minmax(0,1fr)_minmax(0,9rem)_minmax(0,8rem)_minmax(0,11rem)_minmax(0,10rem)_7rem] xl:items-center"
                          >
                            {eventDetails(event, false)}
                          </Button>
                        </div>
                      }
                    >
                      <CardWrapper class="relative overflow-hidden rounded-xl border-0 p-0 shadow-md shadow-slate-900/10 dark:shadow-black/25 lg:p-0">
                        <Button
                          type="button"
                          variant="none"
                          size="none"
                          aria-expanded={props.state.overviewExpanded(event.id)}
                          aria-controls={props.state.overview.panelId(event.id)}
                          aria-label={`Übersicht für ${event.title}`}
                          onClick={() => props.state.overviewToggle(event.id)}
                          class="grid w-full cursor-pointer items-start justify-stretch gap-3 rounded-none p-4 text-left font-normal transition-colors hover:bg-surface-muted/60 active:scale-100 focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          {eventDetails(event, true)}
                        </Button>
                      </CardWrapper>
                    </Show>
                    <Show when={props.state.overviewExpanded(event.id)}>
                      <AdminEventOverviewPanel {...props.state.overview.panelProps()} />
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
