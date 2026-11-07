import { contentHubSeoConfig } from "../../seo/contentHubSeoConfig.ts"
import { contentCollectionConfig } from "./contentCollectionConfig.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"

export type ContentArticleCrumb = {
  readonly title: string
  readonly category: string
}

/**
 * Visible breadcrumb trail matching the BreadcrumbList JSON-LD:
 * home → hub (→ category → article).
 * The category crumb links to the hub section anchor when the category has a
 * hub section, else to the hub path. The last crumb has no href (current page).
 */
export function contentBreadcrumbsCreate(
  collection: ContentCollection,
  article?: ContentArticleCrumb,
): { readonly label: string; readonly href: string | null }[] {
  const hub = contentHubSeoConfig[collection]
  const hubPath = contentCollectionConfig[collection].pathBase
  if (article === undefined)
    return [
      { label: hub.breadcrumbHome, href: "/" },
      { label: hub.breadcrumbHub, href: null },
    ]
  const categories = contentCollectionConfig[collection].categories
  const categoryLabel = categories[article.category] ?? article.category
  const categoryHref = article.category in categories ? `${hubPath}#${article.category}` : hubPath
  return [
    { label: hub.breadcrumbHome, href: "/" },
    { label: hub.breadcrumbHub, href: hubPath },
    { label: categoryLabel, href: categoryHref },
    { label: article.title, href: null },
  ]
}
