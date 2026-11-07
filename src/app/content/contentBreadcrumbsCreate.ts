import { contentHubSeoConfig } from "../../seo/contentHubSeoConfig.ts"
import { contentCollectionConfig } from "./contentCollectionConfig.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"

/**
 * Visible breadcrumb trail matching the BreadcrumbList JSON-LD: home → hub (→ article).
 * The last crumb has no href (current page).
 */
export function contentBreadcrumbsCreate(
  collection: ContentCollection,
  articleTitle?: string,
): { readonly label: string; readonly href: string | null }[] {
  const hub = contentHubSeoConfig[collection]
  const hubPath = contentCollectionConfig[collection].pathBase
  if (articleTitle === undefined)
    return [
      { label: hub.breadcrumbHome, href: "/" },
      { label: hub.breadcrumbHub, href: null },
    ]
  return [
    { label: hub.breadcrumbHome, href: "/" },
    { label: hub.breadcrumbHub, href: hubPath },
    { label: articleTitle, href: null },
  ]
}
