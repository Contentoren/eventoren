import { imageList } from "../app/assets/imageList.ts"
import { urlImage } from "../app/assets/urlImage.ts"
import { seoSiteUrl } from "./seoSiteUrl.ts"

/** The Eventoren publisher `Organization` node (`https://eventoren.de/#organization`) with its square logo. */
export function seoOrganizationJsonLdCreate(): Record<string, unknown> {
  const logo = imageList.Eventoren_Logo
  const logoUrl = urlImage(logo)
  return {
    "@type": "Organization",
    "@id": `${seoSiteUrl}/#organization`,
    name: "Eventoren",
    url: seoSiteUrl,
    logo: {
      "@type": "ImageObject",
      "@id": `${seoSiteUrl}/#logo`,
      url: logoUrl,
      contentUrl: logoUrl,
      width: logo.metadata.width,
      height: logo.metadata.height,
      caption: "Eventoren",
    },
  }
}
