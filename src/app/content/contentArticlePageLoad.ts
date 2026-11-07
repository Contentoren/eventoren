import { createResult, type ResultOk } from "#result"
import { contentArticleLoad } from "./actions/contentArticleLoad.ts"
import type { ContentArticleLoadError } from "./ContentArticleLoadError.ts"
import type { ContentArticlePageData } from "./ContentArticlePageData.ts"
import { contentCollectionList } from "./contentCollectionList.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"
import { contentRelatedList } from "./contentRelatedList.ts"
import { contentTranslationFind } from "./contentTranslationFind.ts"

/**
 * Article route loader: the body (html, headings, faq) comes from the `contentArticleLoad` server function,
 * related articles and the translation counterpart from the client-safe metadata lists.
 */
export async function contentArticlePageLoad(
  collection: ContentCollection,
  slug: string,
): Promise<ResultOk<ContentArticlePageData> | ContentArticleLoadError> {
  const result = await contentArticleLoad({ data: { collection, slug } })
  if (!result.success) return result
  const article = result.data
  const counterpartLang = article.meta.lang === "de" ? "en" : "de"
  const translation =
    article.meta.translationKey === null
      ? undefined
      : contentTranslationFind(article.meta.translationKey, counterpartLang)
  return createResult({
    article,
    related: contentRelatedList(article, contentCollectionList(collection)),
    translation: translation ?? null,
  })
}
