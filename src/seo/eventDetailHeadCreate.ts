import type { EventItem } from "../events/EventItem.ts"
import { eventPriceFrom } from "../events/eventPriceFrom.ts"
import { seoHeadCreate } from "./seoHeadCreate.ts"
import { seoSiteUrl } from "./seoSiteUrl.ts"

export function eventDetailHeadCreate(event: EventItem | undefined) {
  const head = seoHeadCreate("/")
  if (!event) return head

  // Mirrors the sitemap event url so both surfaces publish the same encoded canonical.
  const canonical = new URL(`/events/${encodeURIComponent(event.id)}`, seoSiteUrl).toString()
  const name = event.title.trim()
  const city = event.city.trim()
  const venue = event.venue.trim()
  const subtitle = event.subtitle.trim()
  const titleName = city.length > 0 && !name.includes(city) ? `${name} in ${city}` : name
  const title = `${titleName} | Tickets bei Eventoren`
  const location = [venue, city].filter((part) => part.length > 0).join(", ")
  const lead = [subtitle, location].filter((part) => part.length > 0).join(" – ")
  const description =
    lead.length > 0
      ? `${lead}. Tickets sicher und sofort digital bei Eventoren.`
      : "Tickets sicher und sofort digital bei Eventoren."
  const image = event.imageUrl.trim()

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    name: title,
    description,
    url: canonical,
    isPartOf: { "@id": `${seoSiteUrl}/#website` },
    inLanguage: "de-DE",
  }

  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${canonical}#event`,
    name,
    description: event.description,
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(image.length > 0 ? { image: [image] } : {}),
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
  if (image.length > 0) {
    overrides["og:image"] = image
    overrides["twitter:image"] = image
    const imageAlt = event.imageAlt.trim()
    if (imageAlt.length > 0) overrides["og:image:alt"] = imageAlt
  }

  const metaWithKnownImageDimensions =
    image.length > 0
      ? head.meta.filter(
          (entry) =>
            !("property" in entry && (entry.property === "og:image:width" || entry.property === "og:image:height")),
        )
      : head.meta

  const meta = metaWithKnownImageDimensions.map((entry) => {
    if ("title" in entry) return { title }
    const key = "property" in entry ? entry.property : "name" in entry ? entry.name : ""
    const override = key ? overrides[key] : undefined
    return override ? { ...entry, content: override } : entry
  })

  const scripts = head.scripts.filter(
    (entry) => entry.type !== "application/ld+json" || !entry.children.includes("#webpage"),
  )

  return {
    meta,
    links: [{ rel: "canonical", href: canonical }],
    scripts: [
      ...scripts,
      { type: "application/ld+json", children: JSON.stringify(webPageSchema) },
      { type: "application/ld+json", children: JSON.stringify(eventSchema) },
    ],
  }
}
