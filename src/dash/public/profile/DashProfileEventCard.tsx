import { Link } from "@tanstack/solid-router"
import { mdiMapMarkerOutline } from "@adaptive-ds/mdi/mdiMapMarkerOutline.js"
import { Show } from "solid-js"
import { Img } from "#ui/static/img/Img.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DotPill } from "#ui/static/pill/DotPill.jsx"
import type { DashEvent } from "../../model/dashEventSchema.ts"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import { dashEventPublicPath } from "../../model/dashEventPublicPath.ts"

export interface DashProfileEventCardProps {
  orgSlug: string
  event: DashEvent
  priceLabel: string | null
}

/** Öffentliche Event-Karte im Stil der Katalogkarten: Bild 16:9, Datum, Titel, Ort und Preis. */
export function DashProfileEventCard(p: DashProfileEventCardProps) {
  return (
    <article class="group relative h-full overflow-hidden rounded-card border border-border-subtle bg-surface shadow-sm transition-shadow duration-200 hover:shadow-md">
      <Link to={dashEventPublicPath(p.orgSlug, p.event.slug)} preload={false} class="focus-ring flex h-full flex-col">
        <div class="relative aspect-video overflow-hidden bg-surface-muted">
          <Img
            src={p.event.imageUrl}
            alt={p.event.imageAlt || p.event.title}
            width="1200"
            height="675"
            class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div aria-hidden="true" class="absolute inset-0 bg-linear-to-t from-black/60 via-black/15 to-transparent" />
          <div class="absolute bottom-space-3 left-space-4 right-space-4 flex flex-wrap gap-space-2">
            <span class="rounded-control bg-surface px-2 py-1 text-xs font-semibold text-content">
              {dashDateFormat(p.event.startsAt, "wochentag-datum")}
            </span>
            <Show when={p.event.status === "abgesagt"}>
              <DotPill tone="danger" size="sm">
                Abgesagt
              </DotPill>
            </Show>
            <Show when={p.priceLabel === "Ausverkauft"}>
              <DotPill tone="neutral" size="sm">
                Ausverkauft
              </DotPill>
            </Show>
          </div>
        </div>
        <div class="flex flex-1 flex-col gap-space-1.5 p-5">
          <h3 class="line-clamp-2 text-lg font-bold leading-snug tracking-tight text-content transition-colors group-hover:text-brand-accent">
            {p.event.title}
          </h3>
          <p class="flex items-center gap-1 text-sm text-content-muted">
            <Icon path={mdiMapMarkerOutline} class="size-4 shrink-0" />
            <span class="truncate">
              {p.event.venue.name} · {p.event.venue.city}
            </span>
          </p>
          <p class="mt-auto pt-2 text-base font-bold text-content">{p.priceLabel ?? "Tickets bald verfügbar"}</p>
        </div>
      </Link>
    </article>
  )
}
