import type { ContentArticle } from "./ContentArticle.ts"
import type { ContentListItem } from "./ContentListItem.ts"

/** Loader data of an article route: the article plus related articles and the translation counterpart. */
export type ContentArticlePageData = {
  readonly article: ContentArticle
  readonly related: readonly ContentListItem[]
  readonly translation: ContentListItem | null
}
