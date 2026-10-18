import { For, Show } from "solid-js"
import { mdiOpenInNew } from "@adaptive-ds/mdi/mdiOpenInNew.js"
import { useNavigate } from "@tanstack/solid-router"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { dashEventPhaseGet } from "../../../model/dashEventPhaseGet.ts"
import { dashEventPublicPath } from "../../../model/dashEventPublicPath.ts"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashOrg } from "../../../model/dashOrgSchema.ts"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { ProgressBar } from "#ui/static/progress/ProgressBar.jsx"

export type DashOverviewEventRow = {
  event: DashEvent
  sold: number
  capacity: number
}

export function DashOverviewNextEvents(p: { org: DashOrg; rows: DashOverviewEventRow[]; now: Date }) {
  const navigate = useNavigate()
  const percentOf = (row: DashOverviewEventRow) => (row.capacity > 0 ? Math.round((row.sold / row.capacity) * 100) : 0)
  return (
    <DashSection
      title="Nächste Events"
      footer={
        <LinkButtonInternal to="/demo/dashboard/events" variant="ghost" class="h-9 px-3 text-sm">
          Alle Events
        </LinkButtonInternal>
      }
    >
      <ul class="flex flex-col">
        <For each={p.rows}>
          {(row) => (
            <li class="border-b border-border-subtle last:border-0">
              <div
                role="link"
                tabindex="0"
                aria-label={`${row.event.title}: Event-Übersicht öffnen`}
                onClick={() =>
                  navigate({
                    to: "/demo/dashboard/events/$eventId",
                    params: { eventId: row.event.id },
                  })
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    navigate({
                      to: "/demo/dashboard/events/$eventId",
                      params: { eventId: row.event.id },
                    })
                  }
                }}
                class="grid cursor-pointer grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-2 py-2.5 transition-colors outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:grid-cols-[64px_minmax(0,1fr)_auto_auto] sm:gap-4 sm:px-3"
              >
                <img
                  src={row.event.imageUrl}
                  alt=""
                  class="h-10 w-16 shrink-0 rounded-md object-cover"
                  loading="lazy"
                />
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium text-content">{row.event.title}</span>
                  <span class="mt-0.5 block truncate text-xs text-content-muted">
                    {dashDateFormat(row.event.startsAt, "kurz")} · {row.event.venue.city || row.event.venue.name}
                  </span>
                  <span class="mt-1.5 block max-w-56">
                    <ProgressBar value={row.sold} max={Math.max(row.capacity, 1)} tone="brand" size="sm" />
                    <span class="mt-1 block text-xs tabular-nums text-content-muted">
                      {row.sold} / {row.capacity} · {percentOf(row)} %
                    </span>
                  </span>
                </span>
                <span class="order-3 col-start-2 sm:order-none sm:col-start-auto">
                  <DashStatusPill
                    kind="event"
                    value={dashEventPhaseGet({ event: row.event, sold: row.sold, capacity: row.capacity, now: p.now })}
                  />
                </span>
                <span
                  class="col-start-3 row-start-1 self-start sm:col-start-auto sm:row-start-auto sm:self-center"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <a
                    href={dashEventPublicPath(p.org.slug, row.event.slug)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Öffentliche Seite ansehen"
                    title="Öffentliche Seite ansehen"
                    class="inline-flex size-9 items-center justify-center rounded-md text-content-muted transition-colors outline-none hover:bg-surface-muted hover:text-content focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon path={mdiOpenInNew} class="size-4" />
                  </a>
                </span>
              </div>
            </li>
          )}
        </For>
      </ul>
    </DashSection>
  )
}
