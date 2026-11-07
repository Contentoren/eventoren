import { seoSiteUrl } from "./seoSiteUrl.ts"

/**
 * Reciprocal hreflang alternates for a DE/EN page pair. `x-default` points at the German page.
 * Both pages must emit the same set, so the result does not depend on which side is rendered.
 */
export function contentHreflangLinksCreate(paths: { readonly de: string; readonly en: string }): {
  rel: string
  hreflang: string
  href: string
}[] {
  return [
    { rel: "alternate", hreflang: "de", href: seoSiteUrl + paths.de },
    { rel: "alternate", hreflang: "en", href: seoSiteUrl + paths.en },
    { rel: "alternate", hreflang: "x-default", href: seoSiteUrl + paths.de },
  ]
}
