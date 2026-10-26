type SeoPage = {
  path: string
  title: string
  description: string
  changefreq: "weekly" | "monthly" | "yearly"
  priority: number
  jsonLdType: "WebPage" | "ContactPage"
  noindex?: boolean
}

export const seoPages = [
  {
    path: "/",
    title: "Veranstaltungen entdecken & Tickets kaufen | Eventoren",
    description:
      "Entdecke veröffentlichte Veranstaltungen, prüfe Termine, Orte und Ticketpreise und kaufe deine Tickets direkt bei Eventoren.",
    changefreq: "weekly",
    priority: 1,
    jsonLdType: "WebPage",
  },
  {
    path: "/checkout",
    title: "Kasse | Eventoren",
    description: "Tickets sicher als Gast buchen – transparente Gebühren und sofortiges digitales Ticket.",
    changefreq: "monthly",
    priority: 0.3,
    jsonLdType: "WebPage",
    noindex: true,
  },
  {
    path: "/warenkorb",
    title: "Warenkorb | Eventoren",
    description: "Überprüfe deine ausgewählten Event-Tickets im Warenkorb und gehe direkt zur sicheren Kasse.",
    changefreq: "monthly",
    priority: 0.4,
    jsonLdType: "WebPage",
    noindex: true,
  },
  {
    path: "/kontakt",
    title: "Kontakt | Eventoren",
    description: "Kontakt und Informationen zu Eventoren.",
    changefreq: "monthly",
    priority: 0.7,
    jsonLdType: "ContactPage",
  },
  {
    path: "/support",
    title: "Support | Eventoren",
    description: "Hilfe zu Eventoren, Tickets und Buchungen: Kontakt per E-Mail, Telefon oder Kontaktformular.",
    changefreq: "monthly",
    priority: 0.7,
    jsonLdType: "ContactPage",
  },
  {
    path: "/impressum",
    title: "Impressum | Eventoren",
    description: "Impressum und Anbieterkennzeichnung von Eventoren.",
    changefreq: "yearly",
    priority: 0.2,
    jsonLdType: "WebPage",
  },
  {
    path: "/agb",
    title: "Allgemeine Geschäftsbedingungen (AGB) | Eventoren",
    description: "Allgemeine Geschäftsbedingungen für die Nutzung von Eventoren und den Ticketkauf.",
    changefreq: "yearly",
    priority: 0.2,
    jsonLdType: "WebPage",
  },
] satisfies SeoPage[]
