import type { ContentEntry } from "@adaptive-ds/website-content-pipeline"
import type { ContentFaqItem } from "./ContentFaqItem.ts"
import type { ContentHeading } from "./ContentHeading.ts"
import type { ContentMeta } from "./ContentMeta.ts"

export type ContentArticle = {
  readonly entry: ContentEntry
  readonly meta: ContentMeta
  readonly html: string
  readonly headings: readonly ContentHeading[]
  readonly faq: readonly ContentFaqItem[]
}
