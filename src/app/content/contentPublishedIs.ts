import type { ContentEntry } from "@adaptive-ds/website-content-pipeline"
import { contentTodayRead } from "./contentTodayRead.ts"

/**
 * Publication gate in Europe/Berlin. Use this instead of the generated lists' `isPublishedAtBuild`,
 * whose default cutoff is the UTC date and lags Berlin by up to two hours around midnight.
 */
export function contentPublishedIs(
  entry: Pick<ContentEntry, "publishedAt">,
  today: string = contentTodayRead(),
): boolean {
  return entry.publishedAt <= today
}
