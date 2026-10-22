import { imageList } from "../app/assets/imageList.js"
import { urlImage } from "../app/assets/urlImage.js"
import { seoPages } from "./seoPages.js"
import { seoSiteUrl } from "./seoSiteUrl.js"

function absoluteUrl(path: string) {
  return path === "/" ? seoSiteUrl : `${seoSiteUrl}${path}`
}

export function seoHeadCreate(path: string, options?: { readonly noindex?: boolean }) {
  const page = seoPages.find((candidate) => candidate.path === path)
  const canonical = absoluteUrl(path)
  const noindex = page === undefined ? (options?.noindex ?? true) : (options?.noindex ?? page.noindex ?? false)
  const ogImage = imageList.i1200x630_webp_eventoren_og
  const ogImageUrl = urlImage(ogImage)
  const fallback = seoPages[0]!
  const title = page?.title ?? fallback.title
  const description = page?.description ?? fallback.description
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": page?.jsonLdType ?? fallback.jsonLdType,
    "@id": `${canonical}#webpage`,
    name: title,
    description,
    url: canonical,
    isPartOf: { "@id": `${seoSiteUrl}/#website` },
    inLanguage: "de-DE",
  }
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${seoSiteUrl}/#website`,
    name: "Eventoren",
    url: seoSiteUrl,
    inLanguage: "de-DE",
  }

  return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title },
      { name: "description", content: description },
      { name: "theme-color", content: "#f8fafc" },
      { name: "robots", content: noindex ? "noindex, nofollow" : "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Eventoren" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: canonical },
      { property: "og:image", content: ogImageUrl },
      { property: "og:image:width", content: String(ogImage.metadata.width) },
      { property: "og:image:height", content: String(ogImage.metadata.height) },
      { property: "og:image:alt", content: ogImage.metadata.alt ?? "Eventoren Veranstaltungen und Erlebnisse" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: ogImageUrl },
    ],
    links: [{ rel: "canonical", href: canonical }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(websiteSchema) },
      { type: "application/ld+json", children: JSON.stringify(pageSchema) },
    ],
  }
}
