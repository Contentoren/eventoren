import { expect, test } from "bun:test"
import type { ContentEntry } from "@adaptive-ds/website-content-pipeline"
import type { ContentListItem } from "./ContentListItem.ts"
import type { ContentMeta } from "./ContentMeta.ts"
import { contentHubSectionsCreate } from "./contentHubSectionsCreate.ts"

function listItem(category: string, slug: string): ContentListItem {
  const entry: ContentEntry = {
    id: `${slug}-id`,
    slug,
    path: `/ratgeber/${slug}`,
    contentPath: `content/ratgeber/2026-11-06-${slug}.md`,
    image: null,
    imagePath: null,
    title: `Title ${slug}`,
    description: `Description ${slug}`,
    publishedAt: "2026-11-06",
    updatedAt: null,
    author: null,
    imageAlt: null,
  }
  const meta: ContentMeta = {
    collection: "ratgeber",
    lang: "de",
    category,
    keywords: [],
    translationKey: null,
    seoTitle: null,
    readingMinutes: 10,
    wordCount: 1500,
  }
  return { entry, meta }
}

test("sections follow the configured category order and skip empty categories", () => {
  const sections = contentHubSectionsCreate("ratgeber", [
    listItem("abiball", "abiball-planen-checkliste"),
    listItem("tickets-verkaufen", "tickets-online-verkaufen"),
    listItem("tickets-verkaufen", "ticketpreis-kalkulieren"),
  ])
  expect(sections.map((section) => section.id)).toEqual(["tickets-verkaufen", "abiball"])
  expect(sections[0]?.label).toBe("Tickets verkaufen")
  expect(sections[0]?.cards.map((card) => card.id)).toEqual([
    "tickets-online-verkaufen-id",
    "ticketpreis-kalkulieren-id",
  ])
  expect(sections[1]?.cards).toHaveLength(1)
})

test("cards carry hub display data with the category label and berlin date", () => {
  const sections = contentHubSectionsCreate("ratgeber", [listItem("abiball", "abiball-planen-checkliste")])
  const card = sections[0]?.cards[0]
  expect(card).toMatchObject({
    href: "/ratgeber/abiball-planen-checkliste",
    title: "Title abiball-planen-checkliste",
    categoryLabel: "Abiball",
    readingTime: "10 Min. Lesezeit",
    date: "6. November 2026",
    dateIso: "2026-11-06",
    image: null,
  })
})

test("empty items produce no sections", () => {
  expect(contentHubSectionsCreate("ratgeber", [])).toEqual([])
})
