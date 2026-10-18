import { mdiBrightness7 } from "@adaptive-ds/mdi/mdiBrightness7.js"
import { mdiMapMarkerOutline } from "@adaptive-ds/mdi/mdiMapMarkerOutline.js"
import { mdiTicketConfirmationOutline } from "@adaptive-ds/mdi/mdiTicketConfirmationOutline.js"
import { Show } from "solid-js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DashStatusPill } from "../../ui/status/DashStatusPill.tsx"
import { TicketQrCode } from "../../../ticketing/TicketQrCode.tsx"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import { dashAccountDirectionsUrl } from "../dashAccountDirectionsUrl.ts"
import type { DashAccountTicketRow } from "../model/dashAccountTicketRow.ts"

export function DashAccountTicketCard(p: {
  row: DashAccountTicketRow
  compact?: boolean
  onOpen: (ticketId: string) => void
}) {
  const venue = () => p.row.event?.venue
  const directions = () => {
    const event = p.row.event
    const place = venue()
    if (!event || !place) return null
    return dashAccountDirectionsUrl({ name: event.title, street: place.street, zip: place.zip, city: place.city })
  }
  return (
    <article
      class={`flex flex-col overflow-hidden rounded-card border border-border-subtle bg-surface sm:flex-row ${p.compact === true ? "opacity-70" : ""}`}
    >
      <Show when={p.row.event?.imageUrl}>
        {(src) => (
          <img
            src={src()}
            alt=""
            loading="lazy"
            class="aspect-video w-full shrink-0 object-cover sm:aspect-auto sm:w-44 sm:self-stretch"
          />
        )}
      </Show>
      <div class="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div class="flex flex-wrap items-center gap-2">
          <DashStatusPill kind="ticket" value={p.row.ticket.status === "storniert" ? "storniert" : "gueltig"} />
          <span class="min-w-0 flex-1 truncate text-base font-semibold">{p.row.event?.title ?? "Event"}</span>
        </div>
        <p class="text-sm text-content-muted">
          <Show when={p.row.event} fallback="Termin folgt">
            {(event) => dashDateFormat(event().startsAt, "lang")}
          </Show>
        </p>
        <Show when={venue()}>
          {(place) => (
            <p class="flex items-center gap-1.5 text-sm text-content-muted">
              <Icon path={mdiMapMarkerOutline} class="size-4 shrink-0" />
              <span class="truncate">
                {place().name} · {place().city}
              </span>
            </p>
          )}
        </Show>
        <p class="flex items-center gap-1.5 text-sm">
          <Icon path={mdiTicketConfirmationOutline} class="size-4 shrink-0 text-content-muted" />
          <span class="truncate">
            {p.row.ticketTypeName} · {p.row.ticket.holderName}
          </span>
        </p>
        <div class="mt-1 flex flex-wrap items-center gap-2">
          <Show when={p.compact !== true}>
            <span
              role="button"
              tabindex="0"
              onClick={() => p.onOpen(p.row.ticket.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") p.onOpen(p.row.ticket.id)
              }}
              class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-control bg-brand px-3 text-sm font-medium text-white hover:bg-brand-strong"
            >
              <Icon path={mdiBrightness7} class="size-4" />
              Ticket öffnen
            </span>
          </Show>
          <Show when={directions()}>
            {(href) => (
              <a
                href={href()}
                target="_blank"
                rel="noreferrer"
                class="inline-flex h-9 items-center rounded-control border border-border-subtle px-3 text-sm font-medium hover:bg-surface-muted"
              >
                Anfahrt
              </a>
            )}
          </Show>
        </div>
      </div>
      <Show when={p.compact !== true}>
        <div class="flex items-center justify-center border-t border-border-subtle p-4 sm:border-t-0 sm:border-l">
          <div class="[&_div]:!size-24 [&_figcaption]:hidden">
            <TicketQrCode value={p.row.ticket.code} label={`Ticket ${p.row.ticket.code}`} />
          </div>
        </div>
      </Show>
    </article>
  )
}
