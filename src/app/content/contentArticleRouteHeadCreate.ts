import { contentArticleHeadCreate } from "../../seo/contentArticleHeadCreate.ts"
import type { ContentArticlePageData } from "./ContentArticlePageData.ts"

/** Article route `head`: SEO head from the article head builder plus the route's markdown stylesheet link. */
export function contentArticleRouteHeadCreate(data: ContentArticlePageData | undefined, markdownCssHref: string) {
  const stylesheet = { rel: "stylesheet", href: markdownCssHref }
  if (data === undefined) return { links: [stylesheet] }
  const head = contentArticleHeadCreate(data.article, { translationFind: () => data.translation ?? undefined })
  return { ...head, links: [...head.links, stylesheet] }
}
