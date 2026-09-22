import * as v from "valibot"
import { demoFlowStateSchema, type DemoFlowState } from "./demoFlowStateSchema.ts"

export function demoFlowStateUrlRead(search: string | URLSearchParams | undefined): DemoFlowState | undefined {
  if (!search) return undefined
  const params =
    typeof search === "string" ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search) : search
  const raw = params.get("demoState")
  if (!raw) return undefined
  const result = v.safeParse(demoFlowStateSchema, raw)
  if (!result.success) return undefined
  return result.output
}
