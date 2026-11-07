import type { ContentCollection } from "../app/content/contentCollectionSchema.ts"

type ContentHubSeo = {
  readonly h1: string
  readonly title: string
  readonly description: string
  readonly breadcrumbHome: string
  readonly breadcrumbHub: string
  readonly author: string
  readonly ogImageAlt: string
}

/** Per-hub SEO copy: H1, `<title>`, description, breadcrumb labels and the editorial author name. */
export const contentHubSeoConfig: Readonly<Record<ContentCollection, ContentHubSeo>> = {
  ratgeber: {
    h1: "Ratgeber für Veranstalter 2026/27: Tickets verkaufen, Einlass meistern, rechtssicher planen",
    title: "Ratgeber für Veranstalter 2026/27 | Eventoren",
    description:
      "Ratgeber für Veranstalter: Tickets online verkaufen, Einlass per QR-Code, Abendkasse, GEMA, Steuern und Recht – konkret und aktuell für 2026/27.",
    breadcrumbHome: "Startseite",
    breadcrumbHub: "Ratgeber",
    author: "Eventoren Redaktion",
    ogImageAlt: "Eventoren Veranstaltungen und Erlebnisse",
  },
  guides: {
    h1: "Event Organiser Guides 2026/27: Sell Tickets, Run the Door, Stay Compliant in Europe",
    title: "Event Organiser Guides 2026/27 | Eventoren",
    description:
      "Practical guides for event organisers in Europe: sell tickets online, run QR check-in, price events and stay compliant with VAT, GDPR and EU rules.",
    breadcrumbHome: "Eventoren",
    breadcrumbHub: "Guides",
    author: "Eventoren Editorial Team",
    ogImageAlt: "Eventoren events and experiences",
  },
}
