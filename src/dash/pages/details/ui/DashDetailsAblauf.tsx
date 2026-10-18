import { Show } from "solid-js"

import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { DashScheduleEditor } from "./DashScheduleEditor.tsx"
import type { DashDetailsPageState } from "../dashDetailsPageStateCreate.ts"

/** Sektion „Ablauf“: dein Programm mit Zeiten und Details. */
export function DashDetailsAblauf(p: { state: DashDetailsPageState }) {
  const draft = () => p.state.draft()
  const disabled = () => !p.state.canEdit()

  return (
    <DashSection
      id="details-ablauf"
      title="Ablauf"
      description="Plane dein Programm: Einlass, Programmpunkte und Ende."
      class="scroll-mt-24"
    >
      <Show when={draft()} fallback={null}>
        {(current) => (
          <DashScheduleEditor
            items={current().schedule}
            onChange={(schedule) => p.state.setDraft({ schedule })}
            event={{
              doorsAt: current().doorsAt,
              startsAt: current().startsAt ?? "",
              endsAt: current().endsAt ?? "",
            }}
            disabled={disabled()}
          />
        )}
      </Show>
    </DashSection>
  )
}
