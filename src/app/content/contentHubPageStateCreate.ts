import { createMemo } from "solid-js"
import { contentHubSeoConfig } from "../../seo/contentHubSeoConfig.ts"
import type { ContentListItem } from "./ContentListItem.ts"
import { contentBreadcrumbsCreate } from "./contentBreadcrumbsCreate.ts"
import { contentCollectionConfig } from "./contentCollectionConfig.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"
import { contentHubSectionsCreate } from "./contentHubSectionsCreate.ts"
import { contentViewLabels } from "./contentViewLabels.ts"

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
    sections,
    isEmpty: () => sections().length === 0,
    otherHub: () => ({
      href: contentCollectionConfig[props.collection() === "ratgeber" ? "guides" : "ratgeber"].pathBase,
      lang: otherLang(),
      label: labels().otherHub,
    }),
  }
}
