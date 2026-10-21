import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { VeranstalterDashboardLoadingState } from "../../ui/VeranstalterDashboardLoadingState.tsx"
import { veranstalterDashboardEventStatusMeta } from "./veranstalterDashboardEventStatusMeta.ts"
import type { VeranstalterDashboardEventsListState } from "./veranstalterDashboardEventsListStateCreate.ts"

const tabs = [
  { value: "current", label: "Aktuell" },
  { value: "draft", label: "Entwürfe" },
  { value: "past", label: "Vergangen" },
] as const

/** Live event list: tab navigation and search stay in the URL, rows link to details. */
export function VeranstalterDashboardEventsListPage(p: {
  readonly state: VeranstalterDashboardEventsListState
  readonly orgParam: string | undefined
  readonly queryChange: (query: string) => void
}) {
  return (
    <section aria-labelledby="veranstalter-events" class="flex flex-col gap-4">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex flex-col gap-1">
          <h1 id="veranstalter-events" class="text-xl font-semibold tracking-tight text-content sm:text-2xl">
            Veranstaltungen
          </h1>
          <p class="text-sm text-content-muted">Entwürfe anlegen, Tickets einrichten und veröffentlichen.</p>
        </div>
        <Show when={p.state.canCreate()}>
          <Button variant="filled" size="sm" class="h-9 text-sm" onClick={p.state.createNew}>
            Neue Veranstaltung
          </Button>
        </Show>
      </header>

      <nav aria-label="Veranstaltungsfilter" class="flex flex-wrap gap-2">
        <For each={tabs}>
          {(tab) => (
            <Link
              to="/veranstalter/events"
              search={{ ...(p.orgParam ? { org: p.orgParam } : {}), filter: tab.value }}
              activeProps={{ "data-active": true }}
              class="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-content data-[active]:border-content data-[active]:font-semibold"
            >
              {tab.label}
            </Link>
          )}
        </For>
      </nav>

      <form
        role="search"
        class="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          p.queryChange(p.state.draftQuery())
        }}
      >
        <Input
          type="search"
          value={p.state.draftQuery()}
          onInput={(event) => p.state.draftQueryChange(event.currentTarget.value)}
          placeholder="Titel, Ort oder Schlüssel suchen"
          aria-label="Veranstaltungen suchen"
          class="max-w-md flex-1"
        />
        <Button type="submit" variant="outline" size="sm" class="h-9 text-sm">
          Suchen
        </Button>
      </form>

      <Show when={p.state.rows() === undefined && !p.state.listError()}>
        <VeranstalterDashboardLoadingState />
      </Show>
      <Show when={p.state.listError()}>
        {(message) => (
          <p role="alert" class="rounded-md border border-input px-3 py-2 text-sm text-content">
            {message()}
          </p>
        )}
      </Show>
      <Show when={p.state.isEmpty()}>
        <EmptyState
          icon={mdiTicketOutline}
          title="Keine Veranstaltungen gefunden"
          description="Lege einen Entwurf an oder passe Suche und Filter an."
        />
      </Show>

      <Show when={(p.state.rows()?.length ?? 0) > 0}>
        <ul class="flex flex-col gap-2 sm:hidden">
          <For each={p.state.rows() ?? []}>
            {(event) => (
              <li>
                <Link
                  to="/veranstalter/events/$eventKey"
                  params={{ eventKey: event.eventKey }}
                  search={p.orgParam ? { org: p.orgParam } : {}}
                  class="flex flex-col gap-1 rounded-md border border-input bg-surface p-3"
                >
                  <span class="text-sm font-semibold text-content">{event.title}</span>
                  <span class="text-xs text-content-muted">
                    {event.city} · {event.venue}
                  </span>
                  <span class="flex items-center gap-1 text-xs text-content-muted">
                    <Icon path={veranstalterDashboardEventStatusMeta(event.status).icon} class="size-3.5" />
                    {veranstalterDashboardEventStatusMeta(event.status).label}
                  </span>
                </Link>
              </li>
            )}
          </For>
        </ul>
        <div class="hidden overflow-x-auto sm:block">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-input text-xs text-content-muted">
                <th class="px-2 py-2 font-medium">Titel</th>
                <th class="px-2 py-2 font-medium">Ort</th>
                <th class="px-2 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <For each={p.state.rows() ?? []}>
                {(event) => (
                  <tr class="border-b border-input">
                    <td class="px-2 py-2">
                      <Link
                        to="/veranstalter/events/$eventKey"
                        params={{ eventKey: event.eventKey }}
                        search={p.orgParam ? { org: p.orgParam } : {}}
                        class="font-medium text-content underline-offset-2 hover:underline"
                      >
                        {event.title}
                      </Link>
                    </td>
                    <td class="px-2 py-2 text-content-muted">
                      {event.city} · {event.venue}
                    </td>
                    <td class="px-2 py-2 text-content-muted">
                      <span class="flex items-center gap-1">
                        <Icon path={veranstalterDashboardEventStatusMeta(event.status).icon} class="size-3.5" />
                        {veranstalterDashboardEventStatusMeta(event.status).label}
                      </span>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      <Show when={!p.state.isDone() && !p.state.listError() && !p.state.isEmpty()}>
        <div class="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            class="h-9 text-sm"
            onClick={p.state.loadMore}
            disabled={p.state.isLoading()}
          >
            {p.state.isLoading() ? "Lädt …" : "Weitere laden"}
          </Button>
        </div>
      </Show>
    </section>
  )
}
