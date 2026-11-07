import type { ResultErr } from "#result"

export type ContentArticleLoadError = ResultErr & {
  readonly code: string
  readonly httpStatus: number
  readonly retryable: boolean
}
