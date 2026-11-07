import { contentCollectionConfig } from "../app/content/contentCollectionConfig.ts"
import type { ContentCollection } from "../app/content/contentCollectionSchema.ts"
import { contentHubSeoConfig } from "./contentHubSeoConfig.ts"
import { seoSiteUrl } from "./seoSiteUrl.ts"

/**
 * `BreadcrumbList` for a hub (home → hub) or an article (home → hub → article).
 * DE: Startseite → Ratgeber → title; EN: Eventoren → Guides → title.
 */
export function contentBreadcrumbJsonLdCreate(
  collection: ContentCollection,
  article?: { readonly title: string; readonly url: string },
): Record<string, unknown> {
  const hub = contentHubSeoConfig[collection]
  const hubUrl = seoSiteUrl + contentCollectionConfig[collection].pathBase
  const trail = [
    { name: hub.breadcrumbHome, item: `${seoSiteUrl}/` },
    { name: hub.breadcrumbHub, item: hubUrl },
    ...(article === undefined ? [] : [{ name: article.title, item: article.url }]),
  ]
  const pageUrl = article?.url ?? hubUrl
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  }
}
