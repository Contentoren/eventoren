import { imageList } from "../app/assets/imageList.js"
import { urlImage } from "../app/assets/urlImage.js"
import { seoPages } from "./seoPages.js"
import { seoSiteUrl } from "./seoSiteUrl.js"

function absoluteUrl(path: string) {
  return path === "/" ? seoSiteUrl : `${seoSiteUrl}${path}`
}

export function seoHeadCreate(path: string) {
  const page = seoPages.find((candidate) => candidate.path === path) ?? seoPages[0]!
  const canonical = absoluteUrl(page.path)
  const ogImage = imageList.eventoren_og
  const ogImageUrl = urlImage(ogImage)
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": page.jsonLdType,
    "@id": `${canonical}#webpage`,
    name: page.title,
    description: page.description,
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
      { title: page.title },
      { name: "description", content: page.description },
      { name: "theme-color", content: "#f8fafc" },
      { name: "robots", content: page.noindex === true ? "noindex, follow" : "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Eventoren" },
      { property: "og:title", content: page.title },
      { property: "og:description", content: page.description },
      { property: "og:url", content: canonical },
      { property: "og:image", content: ogImageUrl },
      { property: "og:image:width", content: String(ogImage.width) },
      { property: "og:image:height", content: String(ogImage.height) },
      { property: "og:image:alt", content: ogImage.alt },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: page.title },
      { name: "twitter:description", content: page.description },
      { name: "twitter:image", content: ogImageUrl },
    ],
    links: [{ rel: "canonical", href: canonical }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(websiteSchema) },
      { type: "application/ld+json", children: JSON.stringify(pageSchema) },
    ],
  }
}
