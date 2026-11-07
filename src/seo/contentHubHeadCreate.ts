import type { ContentListItem } from "../app/content/ContentListItem.ts"
import { contentCollectionConfig } from "../app/content/contentCollectionConfig.ts"
import type { ContentCollection } from "../app/content/contentCollectionSchema.ts"
import { contentBreadcrumbJsonLdCreate } from "./contentBreadcrumbJsonLdCreate.ts"
import { contentHreflangLinksCreate } from "./contentHreflangLinksCreate.ts"
import { contentHubJsonLdNodeCreate } from "./contentHubJsonLdNodeCreate.ts"
import { contentHubSeoConfig } from "./contentHubSeoConfig.ts"
import type { SeoHead } from "./SeoHead.ts"
import { seoDefaultOgImageRead } from "./seoDefaultOgImageRead.ts"
import { seoJsonLdGraphScriptCreate } from "./seoJsonLdGraphScriptCreate.ts"
import { seoLocaleRead } from "./seoLocaleRead.ts"
import { seoOrganizationJsonLdCreate } from "./seoOrganizationJsonLdCreate.ts"
import { seoSiteUrl } from "./seoSiteUrl.ts"

type ContentHubHeadOptions = {
  /**
   * Published articles in display order (the route's loader data). Required instead of defaulting to the
   * generated lists so this head builder never statically pulls the metadata into the main entry chunk.
   */
  readonly items: readonly ContentListItem[]
}

/**
 * Route `head` for the `/ratgeber` and `/en/guides` hubs: title, description, canonical, robots index,
 * Open Graph/Twitter, hreflang between both hubs and one JSON-LD `@graph` with CollectionPage,
 * Organization, BreadcrumbList and an ItemList of the published articles.
 */
export function contentHubHeadCreate(collection: ContentCollection, options: ContentHubHeadOptions): SeoHead {
  const config = contentCollectionConfig[collection]
  const hub = contentHubSeoConfig[collection]
  const locale = seoLocaleRead(config.lang)
  const url = seoSiteUrl + config.pathBase
  const items = options.items
  const image = seoDefaultOgImageRead(hub.ogImageAlt)
  const collectionPage = contentHubJsonLdNodeCreate(collection)

  const itemList = {
    "@type": "ItemList",
    "@id": `${url}#articles`,
    numberOfItems: items.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: seoSiteUrl + item.entry.path,
      name: item.entry.title,
    })),
  }

  return {
    meta: [
      { title: hub.title },
      { name: "description", content: hub.description },
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: locale.ogLocale },
      { property: "og:site_name", content: "Eventoren" },
      { property: "og:title", content: hub.title },
      { property: "og:description", content: hub.description },
      { property: "og:url", content: url },
      { property: "og:image", content: image.url },
      { property: "og:image:width", content: String(image.width) },
      { property: "og:image:height", content: String(image.height) },
      { property: "og:image:alt", content: image.alt },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: hub.title },
      { name: "twitter:description", content: hub.description },
      { name: "twitter:image", content: image.url },
    ],
    links: [
      { rel: "canonical", href: url },
      ...contentHreflangLinksCreate({
        de: contentCollectionConfig.ratgeber.pathBase,
        en: contentCollectionConfig.guides.pathBase,
      }),
    ],
    scripts: [
      seoJsonLdGraphScriptCreate([
        { ...collectionPage, breadcrumb: { "@id": `${url}#breadcrumb` }, mainEntity: { "@id": `${url}#articles` } },
        seoOrganizationJsonLdCreate(),
        contentBreadcrumbJsonLdCreate(collection),
        itemList,
      ]),
    ],
  }
}
