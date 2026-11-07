import { createMemo } from "solid-js"
import { contentHubSeoConfig } from "../../seo/contentHubSeoConfig.ts"
import { urlImage } from "../assets/urlImage.js"
import type { ContentListItem } from "./ContentListItem.ts"
import { contentBreadcrumbsCreate } from "./contentBreadcrumbsCreate.ts"
import { contentCollectionConfig } from "./contentCollectionConfig.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"
import { contentHubSectionsCreate } from "./contentHubSectionsCreate.ts"
import type { ContentImageData } from "./contentImages.ts"
import { contentCatalogImageRead } from "./contentImages.ts"
import { contentViewLabels } from "./contentViewLabels.ts"

const hubHeroImageKey = "ratgeber-hub-hero"

/**
 * Hub hero visual (`ratgeber-hub-hero` catalog key). Returns `undefined` until the
 * key resolves in the assets catalog, so the hub keeps today's layout before upload.
 * Alt text follows the hub copy language (German on `/ratgeber`, English on `/en/guides`).
 */
export function contentHubHeroImageRead(lang: "de" | "en"): ContentImageData | undefined {
  const catalogImage = contentCatalogImageRead(hubHeroImageKey)
  if (catalogImage === undefined) return undefined
  return {
    src: urlImage(catalogImage),
    alt: contentViewLabels[lang].hubHeroAlt,
    width: catalogImage.metadata.width,
    height: catalogImage.metadata.height,
  }
}

export function contentHubPageStateCreate(props: {
  readonly collection: () => ContentCollection
  readonly items: () => readonly ContentListItem[]
}) {
  const lang = () => contentCollectionConfig[props.collection()].lang
  const labels = () => contentViewLabels[lang()]
  const sections = createMemo(() => contentHubSectionsCreate(props.collection(), props.items()))
  const otherLang = () => (lang() === "de" ? "en" : "de")
  return {
    lang,
    labels,
    h1: () => contentHubSeoConfig[props.collection()].h1,
    breadcrumbs: () => contentBreadcrumbsCreate(props.collection()),
    heroImage: () => contentHubHeroImageRead(lang()),
    sections,
    isEmpty: () => sections().length === 0,
    otherHub: () => ({
      href: contentCollectionConfig[props.collection() === "ratgeber" ? "guides" : "ratgeber"].pathBase,
      lang: otherLang(),
      label: labels().otherHub,
    }),
  }
}
