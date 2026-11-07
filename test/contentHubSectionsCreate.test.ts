import { expect, test } from "bun:test"
import { contentBreadcrumbsCreate } from "../src/app/content/contentBreadcrumbsCreate.ts"
import { contentHubSectionsCreate } from "../src/app/content/contentHubSectionsCreate.ts"
import { contentListItemFixture } from "./contentViewStateHelpers.fixture.ts"

test("hub sections follow the configured category order and skip empty categories", () => {
  const sections = contentHubSectionsCreate("ratgeber", [
    contentListItemFixture("abi", "abiball"),
    contentListItemFixture("tickets", "tickets-verkaufen", { meta: { readingMinutes: 11 } }),
  ])
  expect(sections.map((section) => [section.id, section.label])).toEqual([
    ["tickets-verkaufen", "Tickets verkaufen"],
    ["abiball", "Abiball"],
  ])
  expect(sections[0]?.cards[0]).toMatchObject({
    href: "/ratgeber/tickets",
    categoryLabel: "Tickets verkaufen",
    readingTime: "11 Min. Lesezeit",
    date: "6. November 2026",
  })
})

test("an empty collection has no hub sections", () => {
  expect(contentHubSectionsCreate("guides", [])).toEqual([])
})

test("visible breadcrumbs match the JSON-LD trail in the article language", () => {
  expect(contentBreadcrumbsCreate("ratgeber")).toEqual([
    { label: "Startseite", href: "/" },
    { label: "Ratgeber", href: null },
  ])
  expect(contentBreadcrumbsCreate("guides", "Fake Tickets")).toEqual([
    { label: "Eventoren", href: "/" },
    { label: "Guides", href: "/en/guides" },
    { label: "Fake Tickets", href: null },
  ])
})
