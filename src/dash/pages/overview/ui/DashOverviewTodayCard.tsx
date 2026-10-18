import { Show } from "solid-js"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { dashEventPublicPath } from "../../../model/dashEventPublicPath.ts"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashOrg } from "../../../model/dashOrgSchema.ts"
import { Button } from "#ui/interactive/button/Button.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { ProgressBar } from "#ui/static/progress/ProgressBar.jsx"

export function DashOverviewTodayCard(p: { org: DashOrg; event: DashEvent; checkedIn: number; validTickets: number }) {
  const publicPath = () => dashEventPublicPath(p.org.slug, p.event.slug)
  const shareScanner = () => {
    void navigator.clipboard?.writeText(`${window.location.origin}${publicPath()}`).catch(() => undefined)
  }
  return (
    <div class="rounded-card border border-l-4 border-border-subtle border-l-brand bg-surface p-4 sm:p-5">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <img src={p.event.imageUrl} alt="" class="h-24 w-full rounded-lg object-cover sm:h-20 sm:w-32" loading="lazy" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-content">{p.event.title}</p>
          <p class="mt-0.5 text-sm text-content-muted">Einlass läuft · {dashDateFormat(p.event.startsAt, "zeit")}</p>
          <div class="mt-2">
            <ProgressBar
              value={p.checkedIn}
              max={Math.max(p.validTickets, 1)}
              tone="brand"
              label={`${p.checkedIn} von ${p.validTickets} eingecheckt`}
            />
            <p class="mt-1 text-xs tabular-nums text-content-muted">
              {p.checkedIn} / {p.validTickets} eingecheckt
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 max-sm:flex-col max-sm:flex-nowrap max-sm:items-stretch">
          <LinkButtonInternal
            to="/demo/dashboard/events/$eventId/einlass"
            params={{ eventId: p.event.id }}
            variant="contrast"
            class="h-9 gap-1.5 px-3 text-sm"
          >
            Live-Einlass
          </LinkButtonInternal>
          <Show when={p.event.boxOffice.enabled}>
            <LinkButtonInternal
              to="/demo/kasse/$eventId"
              params={{ eventId: p.event.id }}
              variant="outline"
              newTab
              class="h-9 gap-1.5 px-3 text-sm"
            >
              Kassenmodus
            </LinkButtonInternal>
          </Show>
          <Button variant="outline" class="h-9 gap-1.5 px-3 text-sm" onClick={shareScanner}>
            Scanner-Link teilen
          </Button>
        </div>
      </div>
    </div>
  )
}
