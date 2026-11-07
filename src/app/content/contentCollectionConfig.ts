import type { ContentCollection } from "./contentCollectionSchema.ts"

type ContentCollectionConfig = {
  readonly collection: ContentCollection
  readonly lang: "de" | "en"
  /** Project-relative source directory, also the pipeline's public content dir. */
  readonly dir: string
  readonly pathBase: string
  readonly categories: Readonly<Record<string, string>>
  readonly buyerCategory: string
  readonly legalCategory: string
  readonly takeawaysLabel: string
  readonly faqHeading: string
  readonly sourcesHeading: string
  readonly eventorenHeading: string
  readonly buyerEventorenHeading: string
  readonly legalDisclaimer: string
  readonly wordCountMin: number
  readonly wordCountTarget: number
  readonly wordCountMax: number
}

export const contentCollectionConfig: Readonly<Record<ContentCollection, ContentCollectionConfig>> = {
  ratgeber: {
    collection: "ratgeber",
    lang: "de",
    dir: "content/ratgeber",
    pathBase: "/ratgeber",
    categories: {
      "tickets-verkaufen": "Tickets verkaufen",
      "einlass-event-tag": "Einlass & Event-Tag",
      "recht-steuern": "Recht & Steuern",
      abiball: "Abiball",
      "vereine-schulen": "Vereine & Schulen",
      eventformate: "Eventformate",
      "planung-marketing": "Planung & Marketing",
      ticketkaeufer: "Für Ticketkäufer",
    },
    buyerCategory: "ticketkaeufer",
    legalCategory: "recht-steuern",
    takeawaysLabel: "Das Wichtigste in Kürze",
    faqHeading: "Häufige Fragen",
    sourcesHeading: "Quellen",
    eventorenHeading: "So setzt du das mit Eventoren um",
    buyerEventorenHeading: "Tickets bei Eventoren",
    legalDisclaimer: "Dieser Artikel ersetzt keine Rechts- oder Steuerberatung.",
    wordCountMin: 1500,
    wordCountTarget: 1800,
    wordCountMax: 3000,
  },
  guides: {
    collection: "guides",
    lang: "en",
    dir: "content/guides",
    pathBase: "/en/guides",
    categories: {
      "selling-tickets": "Selling tickets",
      "on-the-day": "On the day",
      "law-tax": "Law & tax",
      "event-types": "Event types",
      "planning-marketing": "Planning & marketing",
      "for-ticket-buyers": "For ticket buyers",
    },
    buyerCategory: "for-ticket-buyers",
    legalCategory: "law-tax",
    takeawaysLabel: "Key takeaways",
    faqHeading: "Frequently asked questions",
    sourcesHeading: "Sources",
    eventorenHeading: "How to do this with Eventoren",
    buyerEventorenHeading: "Tickets on Eventoren",
    legalDisclaimer: "This guide is not legal or tax advice.",
    wordCountMin: 1200,
    wordCountTarget: 1500,
    wordCountMax: 2500,
  },
}
