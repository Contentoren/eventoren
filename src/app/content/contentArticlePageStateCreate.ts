import { createMemo } from "solid-js"
import type { ContentArticlePageData } from "./ContentArticlePageData.ts"
import { contentBreadcrumbsCreate } from "./contentBreadcrumbsCreate.ts"
import { contentCardCreate } from "./contentCardCreate.ts"
import { contentCtaConfig } from "./contentCtaConfig.ts"
import { contentCtaVariantRead } from "./contentCtaVariantRead.ts"
import { contentDateFormat } from "./contentDateFormat.ts"
import { contentTocItemsCreate } from "./contentTocItemsCreate.ts"
import { contentViewLabels } from "./contentViewLabels.ts"

export function contentArticlePageStateCreate(props: { readonly data: () => ContentArticlePageData }) {
  const article = () => props.data().article
  const lang = () => article().meta.lang
  const labels = () => contentViewLabels[lang()]
  const card = createMemo(() => contentCardCreate(article()))
  const updatedAt = () => article().entry.updatedAt
  return {
    lang,
    labels,
    entry: () => article().entry,
    html: () => article().html,
    breadcrumbs: () => contentBreadcrumbsCreate(article().meta.collection, article().entry.title),
    categoryLabel: () => card().categoryLabel,
    author: () => article().entry.author,
    dateLabel: () => {
      const value = updatedAt()
      if (value === null) return contentDateFormat(article().entry.publishedAt, lang())
      return `${labels().updatedAt} ${contentDateFormat(value, lang())}`
    },
    dateIso: () => card().dateIso,
    readingTime: () => card().readingTime,
    heroImage: () => card().image,
    toc: createMemo(() => contentTocItemsCreate(article().headings)),
    cta: () => contentCtaConfig[lang()][contentCtaVariantRead(article().meta.collection, article().meta.category)],
    related: createMemo(() => props.data().related.map(contentCardCreate)),
    translation: () => {
      const item = props.data().translation
      if (item === null) return null
      return { href: item.entry.path, lang: item.meta.lang, label: labels().translation }
    },
  }
}
