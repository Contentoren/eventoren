import type { JsonValue } from "./jsonValue.js"
import type { ResultErrorHttpStatus } from "./resultErrorHttpStatus.js"

export type ResultError = {
  readonly code: `${string}.${string}`
  readonly message: string
  readonly op: string
  readonly status: ResultErrorHttpStatus
  readonly requestId?: string
  readonly retryable: boolean
  readonly details: JsonValue
}
