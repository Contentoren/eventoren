import type { ContentEntry } from "@adaptive-ds/website-content-pipeline"
import type { ContentFaqItem } from "../app/content/ContentFaqItem.ts"
import type { ContentListItem } from "../app/content/ContentListItem.ts"
import type { ContentMeta } from "../app/content/ContentMeta.ts"
import { contentCollectionConfig } from "../app/content/contentCollectionConfig.ts"
import { contentImageRead } from "../app/content/contentImages.ts"
import { contentTodayRead } from "../app/content/contentTodayRead.ts"
import { contentBreadcrumbJsonLdCreate } from "./contentBreadcrumbJsonLdCreate.ts"
import { contentHreflangLinksCreate } from "./contentHreflangLinksCreate.ts"
import { contentHubJsonLdNodeCreate } from "./contentHubJsonLdNodeCreate.ts"
import { contentHubSeoConfig } from "./contentHubSeoConfig.ts"
import type { SeoHead } from "./SeoHead.ts"
import { seoDateTimeBerlinFormat } from "./seoDateTimeBerlinFormat.ts"
import { seoDefaultOgImageRead } from "./seoDefaultOgImageRead.ts"
import { seoJsonLdGraphScriptCreate } from "./seoJsonLdGraphScriptCreate.ts"
import { seoLocaleRead } from "./seoLocaleRead.ts"
import { seoOrganizationJsonLdCreate } from "./seoOrganizationJsonLdCreate.ts"
import { seoSiteUrl } from "./seoSiteUrl.ts"

type ContentArticleHeadInput = {
  readonly entry: ContentEntry
  readonly meta: ContentMeta
  readonly faq: readonly ContentFaqItem[]
}

type ContentArticleHeadOptions = {
  /** Publication cutoff (YYYY-MM-DD, Europe/Berlin). Defaults to today. */
  readonly today?: string
  /**
   * Counterpart lookup for hreflang (routes pass the loader's resolved translation). Required instead of
   * defaulting to the generated lists so this head builder never statically pulls the metadata into the
   * main entry chunk.
   */
  readonly translationFind: (translationKey: string, lang: "de" | "en") => ContentListItem | undefined
}

/**
 * Route `head` for a Ratgeber/Guides article: title, description, canonical, robots, Open Graph/Twitter,
 * article:* meta, reciprocal hreflang (only when a translation exists) and one JSON-LD `@graph` with
 * Article, Organization, BreadcrumbList and (when the article has FAQ entries) FAQPage.
 */
export function contentArticleHeadCreate(
  article: ContentArticleHeadInput,
  options: ContentArticleHeadOptions,
): SeoHead {
  const { entry, meta, faq } = article
  const today = options.today ?? contentTodayRead()
  const translationFind = options.translationFind
  const collectionConfig = contentCollectionConfig[meta.collection]
  const hub = contentHubSeoConfig[meta.collection]
  const locale = seoLocaleRead(meta.lang)
  const url = seoSiteUrl + entry.path
  const title = `${meta.seoTitle ?? entry.title} | Eventoren`
  const published = entry.publishedAt <= today
  const datePublished = seoDateTimeBerlinFormat(entry.publishedAt)
  const dateModified = seoDateTimeBerlinFormat(entry.updatedAt ?? entry.publishedAt)
  const section = collectionConfig.categories[meta.category] ?? meta.category

  const resolvedImage = contentImageRead(entry)
  const fallbackImage = seoDefaultOgImageRead(hub.ogImageAlt)
  const image =
    resolvedImage?.width !== undefined && resolvedImage.height !== undefined
      ? {
          url: new URL(resolvedImage.src, seoSiteUrl).toString(),
          width: resolvedImage.width,
          height: resolvedImage.height,
          // Frontmatter alt first: EN guides reuse the DE image but carry English alt text.
          alt: entry.imageAlt ?? resolvedImage.alt,
        }
      : fallbackImage

  const counterpartLang = meta.lang === "de" ? "en" : "de"
  const counterpart = meta.translationKey === null ? undefined : translationFind(meta.translationKey, counterpartLang)
  const hreflangLinks =
    counterpart === undefined
      ? []
      : contentHreflangLinksCreate(
          meta.lang === "de"
            ? { de: entry.path, en: counterpart.entry.path }
            : { de: counterpart.entry.path, en: entry.path },
        )

  const organization = seoOrganizationJsonLdCreate()
  const articleNode = {
    "@type": "Article",
    "@id": `${url}#article`,
    headline: entry.title,
    description: entry.description,
    inLanguage: locale.inLanguage,
    datePublished,
    dateModified,
    author: { "@type": "Organization", name: entry.author ?? hub.author, url: seoSiteUrl },
    publisher: { "@id": organization["@id"] },
    image: { "@type": "ImageObject", url: image.url, width: image.width, height: image.height, caption: image.alt },
    mainEntityOfPage: { "@type": "WebPage", "@id": url, url },
    keywords: meta.keywords.join(", "),
    articleSection: section,
    wordCount: meta.wordCount,
    isPartOf: { "@id": contentHubJsonLdNodeCreate(meta.collection)["@id"] },
  }
  const faqNodes =
    faq.length === 0
      ? []
      : [
          {
            "@type": "FAQPage",
            "@id": `${url}#faq`,
            inLanguage: locale.inLanguage,
            mainEntity: faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answerText },
            })),
          },
        ]

  return {
    meta: [
      { title },
      { name: "description", content: entry.description },
      { name: "robots", content: published ? "index, follow" : "noindex, nofollow" },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: locale.ogLocale },
      { property: "og:site_name", content: "Eventoren" },
      { property: "og:title", content: title },
      { property: "og:description", content: entry.description },
      { property: "og:url", content: url },
      { property: "og:image", content: image.url },
      { property: "og:image:width", content: String(image.width) },
      { property: "og:image:height", content: String(image.height) },
      { property: "og:image:alt", content: image.alt },
      { property: "article:published_time", content: datePublished },
      { property: "article:modified_time", content: dateModified },
      { property: "article:section", content: section },
      // TanStack's HeadContent keeps one meta per property, so repeated article:tag tags would collapse to one.
      ...(meta.keywords.length > 0 ? [{ property: "article:tag", content: meta.keywords.join(", ") }] : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: entry.description },
      { name: "twitter:image", content: image.url },
      { name: "twitter:image:alt", content: image.alt },
    ],
    links: [{ rel: "canonical", href: url }, ...hreflangLinks],
    scripts: [
      seoJsonLdGraphScriptCreate([
        articleNode,
        organization,
        contentBreadcrumbJsonLdCreate(meta.collection, { title: entry.title, url, category: meta.category }),
        ...faqNodes,
      ]),
    ],
  }
}
