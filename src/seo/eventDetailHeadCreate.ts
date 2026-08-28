import type { EventItem } from "../events/EventItem.ts"
import { eventPriceFrom } from "../events/eventPriceFrom.ts"
import { seoHeadCreate } from "./seoHeadCreate.ts"
import { seoSiteUrl } from "./seoSiteUrl.ts"

export function eventDetailHeadCreate(event: EventItem | undefined) {
  const head = seoHeadCreate("/")
  if (!event) return head

  const canonical = `${seoSiteUrl}/events/${event.id}`
  const title = `${event.title} | Tickets bei Eventoren`
  const description = `${event.subtitle} – ${event.venue}, ${event.city}. Tickets sicher und sofort digital bei Eventoren.`

  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${canonical}#event`,
    name: event.title,
    description: event.description,
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue,
      address: { "@type": "PostalAddress", streetAddress: event.address, addressLocality: event.city },
    },
    organizer: { "@type": "Organization", name: event.organizer },
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: "EUR",
      price: (eventPriceFrom(event) / 100).toFixed(2),
      availability: event.soldOut ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    },
  }

  const overrides: Record<string, string> = {
    description,
    "og:title": title,
    "og:description": description,
    "og:url": canonical,
    "twitter:title": title,
    "twitter:description": description,
  }

  const meta = head.meta.map((entry) => {
    if ("title" in entry) return { title }
    const key = "property" in entry ? entry.property : "name" in entry ? entry.name : ""
    const override = key ? overrides[key] : undefined
    return override ? { ...entry, content: override } : entry
  })

  return {
    meta,
    links: [{ rel: "canonical", href: canonical }],
    scripts: [...head.scripts, { type: "application/ld+json", children: JSON.stringify(eventSchema) }],
  }
}
