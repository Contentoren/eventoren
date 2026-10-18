import type { Result } from "#result"

import type { DashState } from "../model/dashStateSchema.ts"
import { dashStoreGet } from "./dashStoreGet.ts"

export function dashStoreUpdate(op: string, fn: (draft: DashState) => void): Result<void> {
  return dashStoreGet().update(op, fn)
}
