import type { ContentEntry } from "@adaptive-ds/website-content-pipeline"
import type { ContentMeta } from "./ContentMeta.ts"

export type ContentListItem = {
  readonly entry: ContentEntry
  readonly meta: ContentMeta
}
