import type { ContentListItem } from "../app/content/ContentListItem.ts"
import { contentCollectionConfig } from "../app/content/contentCollectionConfig.ts"
import { contentCollectionSchema } from "../app/content/contentCollectionSchema.ts"
import type { SitemapUrlEntry } from "./sitemapUrlEntry.ts"

/**
 * Sitemap entries of the Ratgeber/Guides hubs and their published articles.
 *
 * Articles carry their real modification date, hubs the newest date of their articles. DE/EN pairs
 * sharing a `translationKey` (and the two hubs) get reciprocal hreflang alternates with `x-default`
 * on the German page, matching the alternates in the HTML heads. Entries dated after `today` are skipped.
 */
export function sitemapContentUrlListCreate(input: {
  readonly siteUrl: string
  readonly today: string
  readonly items: readonly ContentListItem[]
}): SitemapUrlEntry[] {
  const published = input.items.filter((item) => item.entry.publishedAt <= input.today)
  const url = (path: string) => new URL(path, input.siteUrl).toString()
  const alternatesCreate = (paths: { readonly de: string; readonly en: string }) => [
    { hreflang: "de", href: url(paths.de) },
    { hreflang: "en", href: url(paths.en) },
    { hreflang: "x-default", href: url(paths.de) },
  ]
  const lastmodRead = (item: ContentListItem) => item.entry.updatedAt ?? item.entry.publishedAt

  const hubEntries = contentCollectionSchema.options.map((collection): SitemapUrlEntry => {
    const lastmod = published
      .filter((item) => item.meta.collection === collection)
      .map(lastmodRead)
      .reduce<string | undefined>((newest, date) => (newest === undefined || date > newest ? date : newest), undefined)
    return {
      loc: url(contentCollectionConfig[collection].pathBase),
      ...(lastmod === undefined ? {} : { lastmod }),
      changefreq: "weekly",
      priority: 0.7,
      alternates: alternatesCreate({
        de: contentCollectionConfig.ratgeber.pathBase,
        en: contentCollectionConfig.guides.pathBase,
      }),
    }
  })

  const articleEntries = published.map((item): SitemapUrlEntry => {
    const key = item.meta.translationKey
    const counterpart =
      key === null
        ? undefined
        : published.find((other) => other.meta.translationKey === key && other.meta.lang !== item.meta.lang)
    const pair =
      counterpart === undefined
        ? undefined
        : item.meta.lang === "de"
          ? { de: item.entry.path, en: counterpart.entry.path }
          : { de: counterpart.entry.path, en: item.entry.path }
    return {
      loc: url(item.entry.path),
      lastmod: lastmodRead(item),
      changefreq: "monthly",
      priority: 0.6,
      ...(pair === undefined ? {} : { alternates: alternatesCreate(pair) }),
    }
  })

  return [...hubEntries, ...articleEntries]
}
