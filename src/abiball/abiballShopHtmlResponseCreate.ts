import { seoSiteUrl } from "../seo/seoSiteUrl.ts"

const abiballShopCanonicalUrl = `${seoSiteUrl}/abiball-2027`

export function abiballShopHtmlResponseCreate(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      Link: `<${abiballShopCanonicalUrl}>; rel="canonical"`,
      "Cache-Control": "no-store",
    },
  })
}
