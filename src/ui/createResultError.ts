import type { ResultErr } from "./ResultErr.ts"

export function createResultError(op: string, errorMessage: string, rawData?: unknown): ResultErr {
  return { success: false, op, errorMessage, rawData }
}
