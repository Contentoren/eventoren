import { Show } from "solid-js"
import { mdiQrcodeScan } from "@adaptive-ds/mdi/mdiQrcodeScan.js"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

import { dashActiveOrg } from "../../../store/dashActiveOrg.ts"
import { dashOrgEvents } from "../../../store/dashOrgEvents.ts"
import { DashSection } from "../../../ui/layout/DashSection.tsx"

/** Karte „Aushilfen am Einlass?“: Scanner-Links brauchen kein Konto, Link zum Live-Einlass. */
export function DashTeamScannerHint() {
  const nextEvent = () => {
    const org = dashActiveOrg()
    if (!org) return null
    const now = Date.now()
    const upcoming = dashOrgEvents(org.id)
      .filter((event) => event.status !== "abgesagt")
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    return upcoming.find((event) => Date.parse(event.startsAt) >= now) ?? upcoming[upcoming.length - 1] ?? null
  }

  return (
    <DashSection title="Aushilfen am Einlass?">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="flex items-start gap-2 text-sm text-content-muted">
          <Icon path={mdiQrcodeScan} class="mt-0.5 size-5 shrink-0" />
          <span>Scanner-Links funktionieren ohne Konto – deine Aushilfen brauchen nur den Link, keine Einladung.</span>
        </p>
        <Show when={nextEvent()}>
          {(event) => (
            <LinkButtonInternal
              to="/demo/dashboard/events/$eventId/einlass"
              params={{ eventId: event().id }}
              variant="outline"
              class="h-9 shrink-0 px-3 text-sm"
            >
              Zum Live-Einlass
            </LinkButtonInternal>
          )}
        </Show>
      </div>
    </DashSection>
  )
}
