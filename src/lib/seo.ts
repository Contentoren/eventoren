import type { JSX } from "solid-js"
import type { ContentEntry } from "../app/content/contentList.js"
import { isPublishedAtBuild } from "../app/content/contentList.js"
import { getAbsoluteContentImageUrl } from "../app/content/contentImages.js"
type Meta = JSX.MetaHTMLAttributes<HTMLMetaElement>

const siteUrl = "https://eventoren.contentoren.de"
const siteName = "eventoren"
const siteDescription = "A public Solid website built with Adaptive DS."
const ogImage = siteUrl + "/logo.svg"

function pageMeta(input: { readonly title: string; readonly description?: string; readonly path?: string }): Meta[] {
  const description = input.description ?? siteDescription
  const url = input.path ? siteUrl + input.path : siteUrl
  return [
    { title: input.title },
    { name: "description", content: description },
    { property: "og:title", content: input.title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: siteName },
    { property: "og:url", content: url },
    { property: "og:image", content: ogImage },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: siteName + " logo" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ] as unknown as Meta[]
}

function canonicalLink(path = "/") {
  return { rel: "canonical", href: siteUrl + (path === "/" ? "" : path) }
}

function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    description: siteDescription,
  }
}

function softwareSourceCodeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: siteName,
    url: siteUrl,
    description: siteDescription,
    programmingLanguage: "TypeScript",
    runtimePlatform: "Solid.js",
  }
}

function createArticleSeoHead(entry: ContentEntry) {
  const canonical = siteUrl + entry.path
  const robots = isPublishedAtBuild(entry) ? "index, follow" : "noindex, nofollow"
  const imageUrl = getAbsoluteContentImageUrl(entry, siteUrl)
  const articleOgImage = imageUrl ?? ogImage
  return {
    meta: [
      { title: entry.title + " | " + siteName },
      { name: "description", content: entry.description },
      { name: "robots", content: robots },
      { property: "og:type", content: "article" },
      { property: "og:site_name", content: siteName },
      { property: "og:title", content: entry.title },
      { property: "og:description", content: entry.description },
      { property: "og:url", content: canonical },
      { property: "og:image", content: articleOgImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: entry.imageAlt ?? entry.title },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: entry.title },
      { name: "twitter:description", content: entry.description },
      { name: "twitter:image", content: articleOgImage },
      { property: "article:published_time", content: entry.publishedAt + "T00:00:00Z" },
      ...(entry.updatedAt ? [{ property: "article:modified_time", content: entry.updatedAt + "T00:00:00Z" }] : []),
    ] as unknown as Meta[],
    links: [{ rel: "canonical", href: canonical }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: entry.title,
          description: entry.description,
          url: canonical,
          datePublished: entry.publishedAt + "T00:00:00Z",
          dateModified: (entry.updatedAt ?? entry.publishedAt) + "T00:00:00Z",
          author: { "@type": "Person", name: entry.author ?? siteName },
          image: articleOgImage,
        }),
      },
    ],
  }
}
export const seo = {
  siteUrl,
  siteName,
  siteDescription,
  ogImage,
  pageMeta,
  canonicalLink,
  websiteJsonLd,
  softwareSourceCodeJsonLd,
  createArticleSeoHead,
} as const
