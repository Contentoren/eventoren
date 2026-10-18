import { Show } from "solid-js"

import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { DashFaqEditor } from "./DashFaqEditor.tsx"
import type { DashDetailsPageState } from "../dashDetailsPageStateCreate.ts"

/** Sektion „FAQ“: beantworte die häufigsten Fragen deiner Gäste. */
export function DashDetailsFaq(p: { state: DashDetailsPageState }) {
  const draft = () => p.state.draft()
  const disabled = () => !p.state.canEdit()

  return (
    <DashSection
      id="details-faq"
      title="FAQ"
      description="Beantworte die häufigsten Fragen deiner Gäste."
      class="scroll-mt-24"
    >
      <Show when={draft()} fallback={null}>
        {(current) => (
          <DashFaqEditor items={current().faq} onChange={(faq) => p.state.setDraft({ faq })} disabled={disabled()} />
        )}
      </Show>
    </DashSection>
  )
}
