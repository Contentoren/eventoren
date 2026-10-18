import { Show } from "solid-js"

import type { DashAuditArea } from "../../../model/dashAuditAreaSchema.ts"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { DashAuditTimeline } from "../../audit/ui/DashAuditTimeline.tsx"
import type { DashSettingsPageState } from "../dashSettingsPageStateCreate.ts"

/** Sektion „Protokoll“: organisationsweite Timeline aller Änderungen. */
export function DashSettingsProtokoll(p: {
  state: DashSettingsPageState
  area: DashAuditArea | null
  person: string | null
  onArea: (value: DashAuditArea | null) => void
  onPerson: (value: string | null) => void
}) {
  const org = () => p.state.org()

  return (
    <DashSection
      id="einstellungen-protokoll"
      title="Protokoll"
      description="Alle Änderungen in deiner Organisation — von allen Events und allen Teammitgliedern."
    >
      <Show when={org()}>
        {(current) => (
          <DashAuditTimeline
            orgId={current().id}
            eventId={null}
            area={p.area}
            person={p.person}
            onArea={p.onArea}
            onPerson={p.onPerson}
          />
        )}
      </Show>
    </DashSection>
  )
}
