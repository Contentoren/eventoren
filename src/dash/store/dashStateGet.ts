import type { DashState } from "../model/dashStateSchema.ts"
import { dashStoreGet } from "./dashStoreGet.ts"

export function dashStateGet(): DashState {
  return dashStoreGet().state
}
