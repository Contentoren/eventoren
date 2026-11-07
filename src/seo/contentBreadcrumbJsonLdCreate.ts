import { contentCollectionConfig } from "../app/content/contentCollectionConfig.ts"
import type { ContentCollection } from "../app/content/contentCollectionSchema.ts"
import { contentHubSeoConfig } from "./contentHubSeoConfig.ts"
import { seoSiteUrl } from "./seoSiteUrl.ts"

/**
 * `BreadcrumbList` for a hub (home → hub) or an article (home → hub → category → article).
 * DE: Startseite → Ratgeber → <Kategorie> → title; EN: Eventoren → Guides → <Category> → title.
 * The category node links to the hub section anchor when the category has a hub
 * section, else to the hub path — matching the visible breadcrumb trail.
 */
export function contentBreadcrumbJsonLdCreate(
  collection: ContentCollection,
  article?: { readonly title: string; readonly url: string; readonly category: string },
): Record<string, unknown> {
  const hub = contentHubSeoConfig[collection]
  const config = contentCollectionConfig[collection]
  const hubUrl = seoSiteUrl + config.pathBase
  const trail = [
    { name: hub.breadcrumbHome, item: `${seoSiteUrl}/` },
    { name: hub.breadcrumbHub, item: hubUrl },
    ...(article === undefined
      ? []
      : [
          {
            name: config.categories[article.category] ?? article.category,
            item: article.category in config.categories ? `${hubUrl}#${article.category}` : hubUrl,
          },
          { name: article.title, item: article.url },
        ]),
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
