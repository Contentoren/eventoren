import type { DemoFlowState } from "./demoFlowStateSchema.ts"

export const demoFlowStateList: readonly DemoFlowState[] = ["loaded", "loading", "empty", "error"] as const
