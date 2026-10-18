import { dashStatusPillResolve, type DashStatusPillKind } from "#src/dash/ui/status/dashStatusPillResolve.ts"

export function dashStatusPillStateCreate(inputs: { kind: () => DashStatusPillKind; value: () => string }) {
  const resolved = () => dashStatusPillResolve(inputs.kind(), inputs.value())

  return { resolved }
}

export type DashStatusPillState = ReturnType<typeof dashStatusPillStateCreate>
