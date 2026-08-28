import type { ResultOk } from "./ResultOk.ts"

export function createResult<T>(data: T): ResultOk<T> {
  return { success: true, data }
}
