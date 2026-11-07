import type { ContentArticleHtml } from "./ContentArticleHtml.ts"
import type { ContentFaqItem } from "./ContentFaqItem.ts"

/** Server-only article body: generated into contentArticleBodyList.ts, never bundled for the client. */
export type ContentArticleBody = ContentArticleHtml & {
  readonly faq: readonly ContentFaqItem[]
}
