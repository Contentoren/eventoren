import { For, Show } from "solid-js"
import { ToggleSwitch } from "#ui/input/toggle/ToggleSwitch.jsx"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { useNavigate } from "@tanstack/solid-router"
import { mdiEyeOutline } from "@adaptive-ds/mdi/mdiEyeOutline.js"
import { mdiMapMarkerOutline } from "@adaptive-ds/mdi/mdiMapMarkerOutline.js"
import { mdiCalendarPlus } from "@adaptive-ds/mdi/mdiCalendarPlus.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashOrg } from "../../../model/dashOrgSchema.ts"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { dashActiveOrg } from "../../../store/dashActiveOrg.ts"
import { dashCan } from "../../../store/dashCan.ts"
import { dashReminderUpdate } from "../../../store/actions/messages/dashReminderUpdate.ts"
import { dashIcsCreate } from "../../../export/dashIcsCreate.ts"
import { dashFileNameCreate } from "../../../export/dashFileNameCreate.ts"
import { dashDownload } from "../../../export/dashDownload.ts"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { DashOrgLogo } from "../../../ui/org/DashOrgLogo.tsx"
import { DashMessagePreviewCalendar } from "./DashMessagePreviewCalendar.tsx"

/** Karte „Automatische Erinnerung“: Schalter, Bausteine, Status, Vorschau-Sheet. */
export function DashReminderCard(p: {
  event: DashEvent
  state: { previewOpen: { get(): boolean; set(open: boolean): void } }
}) {
  const navigate = useNavigate()
  const org = (): DashOrg | null => dashActiveOrg()
  const canSend = () => dashCan("nachrichten.senden")
  const reminder = () => p.event.reminder
  const reminderAt = () => new Date(Date.parse(p.event.startsAt) - reminder().hoursBefore * 3_600_000).toISOString()

  const setEnabled = (enabled: boolean) => {
    const result = dashReminderUpdate({ eventId: p.event.id, patch: { enabled } }, undefined as never)
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else toastAdd({ title: enabled ? "Erinnerung eingeschaltet" : "Erinnerung ausgeschaltet", variant: "success" })
  }

  const downloadIcs = () => {
    const ics = dashIcsCreate({
      uid: `${p.event.id}@eventoren.de`,
      title: p.event.title,
      description: reminder().calendar,
      location: `${p.event.venue.name}, ${p.event.venue.street}, ${p.event.venue.zip} ${p.event.venue.city}`,
      startsAt: p.event.startsAt,
      endsAt: p.event.endsAt,
    })
    dashDownload(dashFileNameCreate([p.event.title, "kalendereintrag"], "ics", new Date()), ics, "text/calendar")
    toastAdd({ title: "Kalendereintrag heruntergeladen", variant: "success" })
  }

  const statusText = () =>
    reminder().sentAt
      ? `Gesendet an ${p.event.title} · ${dashDateFormat(reminder().sentAt as string, "wochentag-datum")}`
      : `Geplant für ${dashDateFormat(reminderAt(), "kurz")}`

  return (
    <>
      <DashSection
        title="Automatische Erinnerung"
        description="24 h vor Beginn – mit Anfahrt und Kalendereintrag."
        actions={
          <Show when={canSend()}>
            <Button
              type="button"
              variant="outline"
              class="h-9 px-3 text-sm"
              onClick={() => p.state.previewOpen.set(true)}
            >
              <Icon path={mdiEyeOutline} class="size-4" />
              Vorschau
            </Button>
          </Show>
        }
      >
        <div class="flex flex-col gap-3">
          <ToggleSwitch
            checked={reminder().enabled}
            onChange={setEnabled}
            label="Erinnerung senden"
            description="24 h vor Beginn an alle Ticketinhaber"
            disabled={!canSend()}
          />
          <Show when={reminder().enabled}>
            <div class="flex flex-col gap-1.5">
              <label class="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={reminder().directions !== ""}
                  onChange={() =>
                    dashReminderUpdate({
                      eventId: p.event.id,
                      patch: {
                        directions:
                          reminder().directions !== ""
                            ? ""
                            : "Ab Leipzig Hbf mit der Tram 9 bis Lindenhofstraße, dann 3 Min. zu Fuß.",
                      },
                    })
                  }
                  aria-label="Anfahrt"
                  disabled={!canSend()}
                />
                <span class="inline-flex items-center gap-1.5">
                  <Icon path={mdiMapMarkerOutline} class="size-4 text-content-muted" />
                  Anfahrt
                </span>
              </label>
              <label class="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={reminder().calendar !== ""}
                  onChange={() =>
                    dashReminderUpdate({
                      eventId: p.event.id,
                      patch: { calendar: reminder().calendar !== "" ? "" : `${p.event.title} · ${p.event.venue.name}` },
                    })
                  }
                  aria-label="Kalendereintrag (.ics)"
                  disabled={!canSend()}
                />
                <span class="inline-flex items-center gap-1.5">
                  <Icon path={mdiCalendarPlus} class="size-4 text-content-muted" />
                  Kalendereintrag (.ics)
                </span>
              </label>
            </div>
          </Show>
          <p class="text-sm text-content-muted">{statusText()}</p>
          <Show when={reminder().calendar !== ""}>
            <div>
              <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={downloadIcs}>
                <Icon path={mdiCalendarPlus} class="size-4" />
                Kalendereintrag (.ics)
              </Button>
            </div>
          </Show>
        </div>
      </DashSection>
      <Show when={p.state.previewOpen.get() && org()}>
        {(active) => (
          <DashMessagePreviewCalendar
            open={p.state.previewOpen.get()}
            onClose={() => p.state.previewOpen.set(false)}
            event={p.event}
            org={active()}
          />
        )}
      </Show>
    </>
  )
}
