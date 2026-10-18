import { mdiCalendarRemoveOutline } from "@adaptive-ds/mdi/mdiCalendarRemoveOutline.js"
import { Show } from "solid-js"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import type { DashAuditArea } from "../../../model/dashAuditAreaSchema.ts"
import { dashCan } from "../../../store/dashCan.ts"
import { DashPageHeader } from "../../../ui/DashPageHeader.tsx"
import { DashLockedState } from "../../../ui/locked/DashLockedState.tsx"
import { DashAuditTimeline } from "./DashAuditTimeline.tsx"
import { dashAuditEventStateCreate } from "./dashAuditEventStateCreate.ts"

/** Event-Protokoll: Timeline aller Änderungen am Event mit Bereichs- und Personen-Filter. */
export function DashAuditEventPage(p: {
  eventId: string
  area: DashAuditArea | null
  person: string | null
  onArea: (value: DashAuditArea | null) => void
  onPerson: (value: string | null) => void
}) {
  const state = dashAuditEventStateCreate({ eventId: () => p.eventId })
  const maySee = () => dashCan("events.bearbeiten") || dashCan("finanzen.sehen")

  return (
    <Show
      when={state.event()}
      fallback={
        <div class="rounded-card border border-border-subtle bg-surface">
          <EmptyState
            icon={mdiCalendarRemoveOutline}
            title="Event nicht gefunden"
            description="Vielleicht wurde es gelöscht oder gehört zu einer anderen Organisation."
            actions={
              <LinkButtonInternal to="/demo/dashboard/events" variant={buttonVariant.outline} class="h-9 px-3 text-sm">
                Zu den Events
              </LinkButtonInternal>
            }
          />
        </div>
      }
    >
      <div class="flex flex-col gap-6">
        <DashPageHeader title="Protokoll" description="Alle Änderungen an deinem Event — wer hat was wann getan." />
        <Show
          when={maySee()}
          fallback={
            <DashLockedState description="Du darfst das Protokoll nur mit Bearbeitungs- oder Finanzrechten ansehen." />
          }
        >
          <DashAuditTimeline
            orgId={state.scopedOrgId()}
            eventId={p.eventId}
            area={p.area}
            person={p.person}
            onArea={p.onArea}
            onPerson={p.onPerson}
          />
        </Show>
      </div>
    </Show>
  )
}
