import * as v from "valibot"

export const demoFlowStateSchema = v.picklist(["loaded", "loading", "empty", "error"])

export type DemoFlowState = v.InferOutput<typeof demoFlowStateSchema>
