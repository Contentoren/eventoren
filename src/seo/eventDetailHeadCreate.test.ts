import { expect, test } from "bun:test"
import type { EventItem } from "../events/EventItem.ts"
import { eventDetailHeadCreate } from "./eventDetailHeadCreate.ts"

const siteUrl = "https://eventoren.de"

function publishedEvent(overrides?: Partial<EventItem>): EventItem {
  return {
    id: "abiball-36a4910d",
    catalogVersion: 1,
    title: "Abiball ",
    subtitle: "KABItalismus",
    description: "Der Abiball des Jahrgangs mit Live-DJ, Galabuffet und Aftershowparty.",
    category: "party",
    startsAt: "2027-06-26T18:00:00.000Z",
    endsAt: "2027-06-27T01:00:00.000Z",
    doorsAt: "2027-06-26T17:00:00.000Z",
    venue: "Festsaal Kreuzberg",
    city: "Berlin",
    address: "Am Flutgraben 2",
    organizer: "Abikomitee",
    imageUrl: "https://assets.eventoren.de/production/abiball-kabitalismus.webp",
    imageAlt: "Feierlich dekorierter Abiball-Festsaal",
    tags: [],
    soldOut: false,
    tiers: [
      {
        id: "standard",
        name: "Standardticket",
        description: "Einlass ab 18 Uhr inklusive Galabuffet.",
        priceCents: 2500,
        feeCents: 250,
        capacity: 400,
        available: 132,
        maxPerOrder: 10,
      },
    ],
    ...overrides,
  }
}

function metaContent(head: ReturnType<typeof eventDetailHeadCreate>, key: string): string | undefined {
  const entry = head.meta.find((candidate) => "property" in candidate && candidate.property === key)
  return entry && "content" in entry ? entry.content : undefined
}

function metaName(head: ReturnType<typeof eventDetailHeadCreate>, key: string): string | undefined {
  const entry = head.meta.find((candidate) => "name" in candidate && candidate.name === key)
  return entry && "content" in entry ? entry.content : undefined
}

function headTitle(head: ReturnType<typeof eventDetailHeadCreate>): string | undefined {
  const entry = head.meta.find((candidate) => "title" in candidate)
  return entry && "title" in entry ? entry.title : undefined
}

function jsonLd(head: ReturnType<typeof eventDetailHeadCreate>): Record<string, unknown>[] {
  return head.scripts
    .filter((entry) => entry.type === "application/ld+json")
    .map((entry) => JSON.parse(entry.children) as Record<string, unknown>)
}

test("published event head uses one event canonical with event-specific WebPage, image, trimmed title, and preserved Event values", () => {
  const event = publishedEvent()
  const canonical = `${siteUrl}/events/${event.id}`
  const head = eventDetailHeadCreate(event)

  expect(head.links).toEqual([{ rel: "canonical", href: canonical }])

  const title = headTitle(head)
  expect(title).toBe("Abiball in Berlin | Tickets bei Eventoren")
  expect(metaName(head, "description")).toContain("KABItalismus")
  expect(metaName(head, "description")).toContain("Festsaal Kreuzberg, Berlin")
  expect(metaName(head, "robots")).toBe("index, follow")
  expect(metaContent(head, "og:title")).toBe(title)
  expect(metaContent(head, "og:url")).toBe(canonical)
  expect(metaContent(head, "og:image")).toBe(event.imageUrl)
  expect(metaContent(head, "twitter:image")).not.toBeDefined()
  expect(metaName(head, "twitter:image")).toBe(event.imageUrl)
  expect(metaContent(head, "og:image:alt")).toBe(event.imageAlt)

  const schemas = jsonLd(head)
  const webPages = schemas.filter((schema) => schema["@type"] === "WebPage")
  expect(webPages).toHaveLength(1)
  expect(webPages[0]).toMatchObject({
    "@id": `${canonical}#webpage`,
    name: title,
    url: canonical,
  })
  expect(webPages[0]?.["description"]).toBe(metaName(head, "description"))
  expect(JSON.stringify(schemas)).not.toContain("Eventoren | Veranstaltungen, Events & Erlebnisse")

  const events = schemas.filter((schema) => schema["@type"] === "Event")
  expect(events).toHaveLength(1)
  expect(events[0]).toMatchObject({
    "@id": `${canonical}#event`,
    name: "Abiball",
    description: event.description,
    startDate: "2027-06-26T18:00:00.000Z",
    endDate: "2027-06-27T01:00:00.000Z",
    image: [event.imageUrl],
    location: {
      "@type": "Place",
      name: "Festsaal Kreuzberg",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Am Flutgraben 2",
        addressLocality: "Berlin",
      },
    },
    organizer: { "@type": "Organization", name: "Abikomitee" },
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: "EUR",
      price: "25.00",
      availability: "https://schema.org/InStock",
    },
  })
})

test("event without a catalog image omits Event image instead of inventing one and keeps the city-named title intact", () => {
  const event = publishedEvent({ title: "  Berlin Marathon ", imageUrl: "   ", imageAlt: "" })
  const head = eventDetailHeadCreate(event)

  expect(headTitle(head)).toBe("Berlin Marathon | Tickets bei Eventoren")

  const events = jsonLd(head).filter((schema) => schema["@type"] === "Event")
  expect(events).toHaveLength(1)
  expect(events[0]).not.toHaveProperty("image")

  const genericImage = metaContent(head, "og:image")
  expect(genericImage?.length).toBeGreaterThan(0)
  expect(genericImage).not.toBe(event.imageUrl.trim())
})

test("event id with reserved characters keeps one encoded canonical across the canonical link, og:url, WebPage, Event, and Offer", () => {
  const event = publishedEvent({ id: "summer & grill #1" })
  const canonical = "https://eventoren.de/events/summer%20%26%20grill%20%231"
  const head = eventDetailHeadCreate(event)

  expect(head.links).toEqual([{ rel: "canonical", href: canonical }])
  expect(metaContent(head, "og:url")).toBe(canonical)

  const schemas = jsonLd(head)
  const webPages = schemas.filter((schema) => schema["@type"] === "WebPage")
  expect(webPages).toHaveLength(1)
  expect(webPages[0]).toMatchObject({ "@id": `${canonical}#webpage`, url: canonical })

  const events = schemas.filter((schema) => schema["@type"] === "Event")
  expect(events).toHaveLength(1)
  expect(events[0]?.["@id"]).toBe(`${canonical}#event`)
  expect(events[0]?.offers).toMatchObject({ url: canonical })
})
