import { mdiBrightness7 } from "@adaptive-ds/mdi/mdiBrightness7.js"
import { mdiMapMarkerOutline } from "@adaptive-ds/mdi/mdiMapMarkerOutline.js"
import { Show } from "solid-js"
import { CopyButton } from "#ui/interactive/copy/CopyButton.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { TicketQrCode } from "../../../ticketing/TicketQrCode.tsx"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import { dashAccountDirectionsUrl } from "../dashAccountDirectionsUrl.ts"
import type { DashAccountTicketRow } from "../model/dashAccountTicketRow.ts"

export function DashAccountTicketSheet(p: {
  row: DashAccountTicketRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const venueLabel = () => {
    const event = p.row?.event
    if (!event) return null
    return `${event.venue.name}, ${event.venue.street}, ${event.venue.zip} ${event.venue.city}`
  }
  const directions = () => {
    const event = p.row?.event
    if (!event) return null
    const place = event.venue
    return dashAccountDirectionsUrl({ name: event.title, street: place.street, zip: place.zip, city: place.city })
  }
  return (
    <Sheet
      open={p.open}
      onOpenChange={p.onOpenChange}
      size="md"
      title={p.row?.event?.title ?? "Ticket"}
      description={p.row ? `${p.row.ticketTypeName} · ${p.row.ticket.holderName}` : undefined}
    >
      <Show when={p.row}>
        {(row) => (
          <div class="flex flex-col items-center gap-4 text-center">
            <div class="[&_div]:!size-64">
              <TicketQrCode value={row().ticket.code} label={`Ticket ${row().ticket.code}`} />
            </div>
            <div class="flex items-center gap-2">
              <code class="rounded-control bg-surface-muted px-2 py-1 font-mono text-sm">{row().ticket.code}</code>
              <CopyButton value={row().ticket.code} label="Ticketcode kopieren" />
            </div>
            <dl class="w-full rounded-card border border-border-subtle bg-surface text-left text-sm">
              <div class="flex justify-between gap-4 border-b border-border-subtle px-4 py-2.5">
                <dt class="text-content-muted">Inhaber</dt>
                <dd class="font-medium">{row().ticket.holderName}</dd>
              </div>
              <div class="flex justify-between gap-4 border-b border-border-subtle px-4 py-2.5">
                <dt class="text-content-muted">Termin</dt>
                <dd class="text-right font-medium">
                  {row().event ? dashDateFormat(row().event?.startsAt ?? "", "lang") : "Termin folgt"}
                </dd>
              </div>
              <Show when={venueLabel()}>
                {(label) => (
                  <div class="flex items-center justify-between gap-4 px-4 py-2.5">
                    <dt class="flex items-center gap-1.5 text-content-muted">
                      <Icon path={mdiMapMarkerOutline} class="size-4" />
                      Ort
                    </dt>
                    <dd class="text-right font-medium">{label()}</dd>
                  </div>
                )}
              </Show>
            </dl>
            <p class="flex items-center gap-1.5 text-sm text-content-muted">
              <Icon path={mdiBrightness7} class="size-4" />
              Bildschirmhelligkeit erhöhen
            </p>
            <Show when={directions()}>
              {(href) => (
                <a
                  href={href()}
                  target="_blank"
                  rel="noreferrer"
                  class="inline-flex h-9 items-center rounded-control border border-border-subtle px-3 text-sm font-medium hover:bg-surface-muted"
                >
                  Anfahrt öffnen
                </a>
              )}
            </Show>
          </div>
        )}
      </Show>
    </Sheet>
  )
}
