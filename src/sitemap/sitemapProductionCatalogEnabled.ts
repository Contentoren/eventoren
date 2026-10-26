import { seoSiteUrl } from "../seo/seoSiteUrl.ts"

/**
 * The published catalog may only feed the production sitemap when the build
 * runs in the production environment against the production site origin.
 * Preview and development catalogs must never leak into the production
 * sitemap, and the production build must fail instead of silently shipping a
 * sitemap without its published events.
 */
export function sitemapProductionCatalogEnabled(input: {
  readonly envMode: string | undefined
  readonly siteBaseUrl: string | undefined
}): boolean {
  if (input.envMode !== "production") return false
  if (!input.siteBaseUrl) return false
  try {
    return new URL(input.siteBaseUrl).origin === new URL(seoSiteUrl).origin
  } catch {
    return false
  }
}
