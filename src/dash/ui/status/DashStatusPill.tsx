import { DotPill, type DotPillSize } from "#ui/static/pill/DotPill.jsx"
import { dashStatusPillStateCreate } from "#src/dash/ui/status/dashStatusPillStateCreate.ts"
import type { DashStatusPillKind } from "#src/dash/ui/status/dashStatusPillResolve.ts"

export function DashStatusPill(props: { kind: DashStatusPillKind; value: string; size?: DotPillSize; class?: string }) {
  const state = dashStatusPillStateCreate({ kind: () => props.kind, value: () => props.value })

  return (
    <DotPill tone={state.resolved().tone} pulse={state.resolved().pulse} size={props.size ?? "md"} class={props.class}>
      {state.resolved().label}
    </DotPill>
  )
}
