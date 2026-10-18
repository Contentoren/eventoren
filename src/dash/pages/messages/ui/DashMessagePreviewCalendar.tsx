import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { mdiCalendarPlus } from "@adaptive-ds/mdi/mdiCalendarPlus.js"
import { mdiMapMarkerOutline } from "@adaptive-ds/mdi/mdiMapMarkerOutline.js"
import { mdiCompass } from "@adaptive-ds/mdi/mdiCompass.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashOrg } from "../../../model/dashOrgSchema.ts"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { dashIcsCreate } from "../../../export/dashIcsCreate.ts"
import { dashFileNameCreate } from "../../../export/dashFileNameCreate.ts"
import { dashDownload } from "../../../export/dashDownload.ts"
import { DashMarkdown } from "../../../ui/markdown/DashMarkdown.tsx"
import { DashOrgLogo } from "../../../ui/org/DashOrgLogo.tsx"

/** Erinnerungs-Vorschau: Org-Kopf, Datum, Anfahrt, .ics-Download, Tickethinweis. */
export function DashMessagePreviewCalendar(p: { open: boolean; onClose: () => void; event: DashEvent; org: DashOrg }) {
  const venueLine = () => `${p.event.venue.name} · ${p.event.venue.street}, ${p.event.venue.zip} ${p.event.venue.city}`

  const downloadIcs = () => {
    const ics = dashIcsCreate({
      uid: `${p.event.id}@eventoren.de`,
      title: p.event.title,
      description: p.event.reminder.calendar,
      location: venueLine(),
      startsAt: p.event.startsAt,
      endsAt: p.event.endsAt,
    })
    dashDownload(dashFileNameCreate([p.event.title, "kalendereintrag"], "ics", new Date()), ics, "text/calendar")
    toastAdd({ title: "Kalendereintrag heruntergeladen", variant: "success" })
  }

  return (
    <Sheet
      open={p.open}
      onOpenChange={(open) => {
        if (!open) p.onClose()
      }}
      title="Erinnerungs-Vorschau"
      description="So sieht die automatische Erinnerung aus."
      footer={
        <div class="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={downloadIcs}>
            <Icon path={mdiCalendarPlus} class="size-4" />
            Kalendereintrag (.ics)
          </Button>
          <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={p.onClose}>
            Schließen
          </Button>
        </div>
      }
    >
      <div class="flex flex-col gap-4">
        <div class="flex items-center gap-3 border-b border-border-subtle pb-3">
          <DashOrgLogo name={p.org.name} logoDataUrl={p.org.logoDataUrl} size="md" />
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-content">{p.org.name}</p>
            <p class="text-xs text-content-muted">
              {p.event.venue.name}, {p.event.venue.city}
            </p>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <p class="text-base font-semibold text-content">Morgen: {p.event.title}</p>
          <p class="text-sm text-content-muted">
            {dashDateFormat(p.event.startsAt, "kurz")} · {p.event.venue.name}
          </p>
        </div>
        <p class="text-sm text-content">Hallo Lea,</p>
        <DashMarkdown
          text={`morgen startet **${p.event.title}** am ${dashDateFormat(p.event.startsAt, "datum")}. Wir freuen uns auf dich!`}
        />
        <Show when={p.event.reminder.directions !== ""}>
          <div class="rounded-card border border-border-subtle bg-surface-muted/40 p-3">
            <p class="flex items-center gap-1.5 text-sm font-medium text-content">
              <Icon path={mdiMapMarkerOutline} class="size-4" />
              Anfahrt
            </p>
            <p class="mt-1 text-sm text-content-muted">{p.event.reminder.directions}</p>
            <p class="mt-1 text-sm text-content-muted">{venueLine()}</p>
            <a
              class="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-content underline"
              href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(venueLine())}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon path={mdiCompass} class="size-4" />
              Route planen
            </a>
          </div>
        </Show>
        <p class="text-xs text-content-muted">Dein Ticket findest du im Anhang der E-Mail.</p>
      </div>
    </Sheet>
  )
}
