import type { SitemapUrlEntry } from "./sitemapUrlEntry.ts"

export type SitemapStaticPage = {
  readonly path: string
  readonly changefreq: SitemapUrlEntry["changefreq"]
  readonly priority: number
  readonly noindex?: boolean
}

/**
 * The indexable URL list of the site: static pages, the Ratgeber/Guides hubs
 * and published articles (see `sitemapContentUrlListCreate`) and published events.
 *
 * Static pages carry no `lastmod`, because the build date is not a content
 * modification date. Content entries keep their real modification date, and events
 * carry none because the public catalog contract exposes no modification date.
 */
export function sitemapUrlListCreate(input: {
  readonly siteUrl: string
  readonly pages: readonly SitemapStaticPage[]
  readonly content: readonly SitemapUrlEntry[]
  readonly events: readonly SitemapUrlEntry[]
}): readonly SitemapUrlEntry[] {
  const entries: SitemapUrlEntry[] = []

  for (const page of sitemapStaticPageList(input.pages)) {
    entries.push({
      loc: new URL(page.path, input.siteUrl).toString(),
      changefreq: page.changefreq,
      priority: page.priority,
    })
  }

  entries.push(...input.content)
  entries.push(...input.events)

  const unique = new Map<string, SitemapUrlEntry>()
  for (const entry of entries) if (!unique.has(entry.loc)) unique.set(entry.loc, entry)
  return [...unique.values()].sort((left, right) => (left.loc < right.loc ? -1 : left.loc > right.loc ? 1 : 0))
}

/**
 * Indexable static pages. The privacy page is added when the page list does
 * not contain it yet, so the sitemap always lists the legal pages.
 */
function sitemapStaticPageList(pages: readonly SitemapStaticPage[]): readonly SitemapStaticPage[] {
  const indexable = pages.filter((page) => page.noindex !== true)
  if (pages.some((page) => page.path === "/datenschutz")) return indexable
  return [...indexable, { path: "/datenschutz", changefreq: "yearly", priority: 0.2 }]
}
