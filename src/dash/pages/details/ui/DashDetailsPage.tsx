import { Show } from "solid-js"
import { mdiCalendarRemoveOutline } from "@adaptive-ds/mdi/mdiCalendarRemoveOutline.js"
import { StickySaveBar } from "#ui/interactive/savebar/StickySaveBar.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"

import { DashPageHeader } from "../../../ui/DashPageHeader.tsx"
import { dashDetailsPageStateCreate } from "../dashDetailsPageStateCreate.ts"
import { DashDetailsAblauf } from "./DashDetailsAblauf.tsx"
import { DashDetailsBasis } from "./DashDetailsBasis.tsx"
import { DashDetailsBeschreibung } from "./DashDetailsBeschreibung.tsx"
import { DashDetailsBild } from "./DashDetailsBild.tsx"
import { DashDetailsFaq } from "./DashDetailsFaq.tsx"
import { DashDetailsNav } from "./DashDetailsNav.tsx"
import { DashDetailsOrt } from "./DashDetailsOrt.tsx"
import { DashDetailsGefahrenzone } from "./DashDetailsGefahrenzone.tsx"
import { DashDetailsSichtbarkeit } from "./DashDetailsSichtbarkeit.tsx"

/** Seite „Details“: ganzseitiges Event-Formular mit Anker-Navigation und Speicherleiste. */
export function DashDetailsPage(p: { eventId: string }) {
  const state = dashDetailsPageStateCreate({ eventId: () => p.eventId })

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
        <DashPageHeader title="Details" description="Basis, Ort, Bild und Beschreibung deines Events." />
        <div class="grid items-start gap-6 lg:grid-cols-[1fr_200px]">
          <div class="flex min-w-0 flex-col gap-6">
            <DashDetailsBasis state={state} />
            <DashDetailsOrt state={state} />
            <DashDetailsBild state={state} />
            <DashDetailsBeschreibung state={state} />
            <DashDetailsAblauf state={state} />
            <DashDetailsFaq state={state} />
            <DashDetailsSichtbarkeit state={state} />
            <DashDetailsGefahrenzone state={state} />
          </div>
          <DashDetailsNav state={state} />
        </div>
      </div>
      <StickySaveBar
        visible={state.dirty() && state.canEdit()}
        onSave={state.save}
        onDiscard={state.discard}
        saving={state.savingSignal.get()}
        message="Ungespeicherte Änderungen an deinen Eventdetails"
      />
    </Show>
  )
}
