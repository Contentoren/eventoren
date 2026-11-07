import { expect, test } from "bun:test"
import type { ContentEntry } from "@adaptive-ds/website-content-pipeline"
import type { ContentListItem } from "../src/app/content/ContentListItem.ts"
import { contentHubHeadCreate } from "../src/seo/contentHubHeadCreate.ts"
import type { SeoHead } from "../src/seo/SeoHead.ts"

function itemCreate(slug: string, title: string): ContentListItem {
  const entry: ContentEntry = {
    id: `2026-11-06-${slug}`,
    slug,
    path: `/ratgeber/${slug}`,
    contentPath: `/ratgeber/2026-11-06-${slug}.md`,
    image: null,
    imagePath: null,
    title,
    description: `${title} – Beschreibung`,
    publishedAt: "2026-11-06",
    updatedAt: null,
    author: null,
    imageAlt: null,
  }
  return {
    entry,
    meta: {
      collection: "ratgeber",
      lang: "de",
      category: "tickets-verkaufen",
      keywords: [],
      translationKey: null,
      seoTitle: null,
      readingMinutes: 8,
      wordCount: 1800,
    },
  }
}

const items = [
  itemCreate("tickets-online-verkaufen", "Tickets online verkaufen 2026"),
  itemCreate("ticketgebuehren", "Ticketgebühren 2026"),
]

function metaRead(head: SeoHead, key: string): string | undefined {
  const tag = head.meta.find(
    (candidate) =>
      ("property" in candidate && candidate.property === key) || ("name" in candidate && candidate.name === key),
  )
  return tag !== undefined && "content" in tag ? tag.content : undefined
}

function titleRead(head: SeoHead): string | undefined {
  const tag = head.meta.find((candidate) => "title" in candidate)
  return tag !== undefined && "title" in tag ? tag.title : undefined
}

function crumbNamesRead(breadcrumb: Record<string, unknown> | undefined): string[] {
  const items = (breadcrumb?.["itemListElement"] ?? []) as { name: string }[]
  return items.map((crumb) => crumb.name)
}

function graphRead(head: SeoHead): Record<string, unknown>[] {
  expect(head.scripts).toHaveLength(1)
  return (JSON.parse(head.scripts[0]?.children ?? "") as { "@graph": Record<string, unknown>[] })["@graph"]
}

const hubHreflang = [
  { rel: "alternate", hreflang: "de", href: "https://eventoren.de/ratgeber" },
  { rel: "alternate", hreflang: "en", href: "https://eventoren.de/en/guides" },
  { rel: "alternate", hreflang: "x-default", href: "https://eventoren.de/ratgeber" },
]

test("German hub has its title, a 140–160 character description, canonical, index robots and de_DE locale", () => {
  const head = contentHubHeadCreate("ratgeber", { items })
  expect(titleRead(head)).toBe("Ratgeber für Veranstalter 2026/27 | Eventoren")
  const description = metaRead(head, "description") ?? ""
  expect(description.length).toBeGreaterThanOrEqual(140)
  expect(description.length).toBeLessThanOrEqual(160)
  expect(head.links).toEqual([{ rel: "canonical", href: "https://eventoren.de/ratgeber" }, ...hubHreflang])
  expect(metaRead(head, "robots")).toBe("index, follow")
  expect(metaRead(head, "og:locale")).toBe("de_DE")
})

test("English hub has its own title, description length, canonical, en_GB locale and the same hreflang set", () => {
  const head = contentHubHeadCreate("guides", { items: [] })
  expect(titleRead(head)).toBe("Event Organiser Guides 2026/27 | Eventoren")
  const description = metaRead(head, "description") ?? ""
  expect(description.length).toBeGreaterThanOrEqual(140)
  expect(description.length).toBeLessThanOrEqual(160)
  expect(head.links).toEqual([{ rel: "canonical", href: "https://eventoren.de/en/guides" }, ...hubHreflang])
  expect(metaRead(head, "og:locale")).toBe("en_GB")
})

test("hub JSON-LD graph has CollectionPage, BreadcrumbList and an ordered ItemList of the given articles", () => {
  const graph = graphRead(contentHubHeadCreate("ratgeber", { items }))
  expect(graph.map((node) => node["@type"])).toEqual(["CollectionPage", "Organization", "BreadcrumbList", "ItemList"])
  expect(graph[0]).toMatchObject({ "@id": "https://eventoren.de/ratgeber#webpage", inLanguage: "de-DE" })
  const crumbs = crumbNamesRead(graph[2])
  expect(crumbs).toEqual(["Startseite", "Ratgeber"])
  expect(graph[3]?.["itemListElement"]).toEqual([
    {
      "@type": "ListItem",
      position: 1,
      url: "https://eventoren.de/ratgeber/tickets-online-verkaufen",
      name: "Tickets online verkaufen 2026",
    },
    {
      "@type": "ListItem",
      position: 2,
      url: "https://eventoren.de/ratgeber/ticketgebuehren",
      name: "Ticketgebühren 2026",
    },
  ])
})
