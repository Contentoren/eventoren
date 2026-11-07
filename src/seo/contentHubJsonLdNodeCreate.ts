import { contentCollectionConfig } from "../app/content/contentCollectionConfig.ts"
import type { ContentCollection } from "../app/content/contentCollectionSchema.ts"
import { contentHubSeoConfig } from "./contentHubSeoConfig.ts"
import { seoLocaleRead } from "./seoLocaleRead.ts"
import { seoSiteUrl } from "./seoSiteUrl.ts"

/** The hub `CollectionPage` node (`<hub url>#webpage`), referenced by every article via `isPartOf`. */
export function contentHubJsonLdNodeCreate(collection: ContentCollection): Record<string, unknown> {
  const config = contentCollectionConfig[collection]
  const hub = contentHubSeoConfig[collection]
  const url = seoSiteUrl + config.pathBase
  return {
    "@type": "CollectionPage",
    "@id": `${url}#webpage`,
    url,
    name: hub.h1,
    description: hub.description,
    inLanguage: seoLocaleRead(config.lang).inLanguage,
    isPartOf: { "@id": `${seoSiteUrl}/#website` },
    publisher: { "@id": `${seoSiteUrl}/#organization` },
  }
}
