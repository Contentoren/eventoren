import type { DashAccountMethodLabelResult } from "./dashAccountMethodLabelResult.ts"
import { dashAccountMethodLabelTable } from "./dashAccountMethodLabelTable.ts"

export function dashAccountMethodLabel(method: keyof typeof dashAccountMethodLabelTable): DashAccountMethodLabelResult {
  return { label: dashAccountMethodLabelTable[method] }
}
