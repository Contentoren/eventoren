import { expect, test } from "bun:test"
import { contentBreadcrumbJsonLdCreate } from "./contentBreadcrumbJsonLdCreate.ts"

type ListItem = { readonly "@type": string; readonly position: number; readonly name: string; readonly item: string }

function itemsOf(node: Record<string, unknown>): ListItem[] {
  return node.itemListElement as ListItem[]
}

test("hub breadcrumb json-ld stays home then hub", () => {
  const node = contentBreadcrumbJsonLdCreate("ratgeber")
  expect(node["@type"]).toBe("BreadcrumbList")
  expect(itemsOf(node)).toEqual([
    { "@type": "ListItem", position: 1, name: "Startseite", item: "https://eventoren.de/" },
    { "@type": "ListItem", position: 2, name: "Ratgeber", item: "https://eventoren.de/ratgeber" },
  ])
})

test("article breadcrumb json-ld inserts the category node with a hub section anchor", () => {
  const node = contentBreadcrumbJsonLdCreate("ratgeber", {
    title: "Tickets online verkaufen",
    url: "https://eventoren.de/ratgeber/tickets-online-verkaufen",
    category: "tickets-verkaufen",
  })
  expect(itemsOf(node)).toEqual([
    { "@type": "ListItem", position: 1, name: "Startseite", item: "https://eventoren.de/" },
    { "@type": "ListItem", position: 2, name: "Ratgeber", item: "https://eventoren.de/ratgeber" },
    {
      "@type": "ListItem",
      position: 3,
      name: "Tickets verkaufen",
      item: "https://eventoren.de/ratgeber#tickets-verkaufen",
    },
    {
      "@type": "ListItem",
      position: 4,
      name: "Tickets online verkaufen",
      item: "https://eventoren.de/ratgeber/tickets-online-verkaufen",
    },
  ])
})

test("english article breadcrumb json-ld uses the english category label and guides anchor", () => {
  const node = contentBreadcrumbJsonLdCreate("guides", {
    title: "Sell tickets online",
    url: "https://eventoren.de/en/guides/sell-tickets-online",
    category: "selling-tickets",
  })
  expect(itemsOf(node).map((item) => [item.position, item.name, item.item])).toEqual([
    [1, "Eventoren", "https://eventoren.de/"],
    [2, "Guides", "https://eventoren.de/en/guides"],
    [3, "Selling tickets", "https://eventoren.de/en/guides#selling-tickets"],
    [4, "Sell tickets online", "https://eventoren.de/en/guides/sell-tickets-online"],
  ])
})

test("article in a category without a hub section falls back to the hub path", () => {
  const node = contentBreadcrumbJsonLdCreate("ratgeber", {
    title: "Orphan",
    url: "https://eventoren.de/ratgeber/orphan",
    category: "no-such-category",
  })
  const items = itemsOf(node)
  expect(items).toHaveLength(4)
  expect(items[2]).toMatchObject({ position: 3, name: "no-such-category", item: "https://eventoren.de/ratgeber" })
})
