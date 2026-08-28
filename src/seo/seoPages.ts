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
    title: "Eventoren | Veranstaltungen, Events & Erlebnisse",
    description: "Eventoren präsentiert Veranstaltungen, Termine und Erlebnisse an einem Ort.",
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
    path: "/meine-tickets",
    title: "Meine Tickets | Eventoren",
    description: "Alle gekauften Tickets als Wallet-Pass mit QR-Code – jederzeit abrufbar, auch offline.",
    changefreq: "monthly",
    priority: 0.5,
    jsonLdType: "WebPage",
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
    path: "/impressum",
    title: "Impressum | Eventoren",
    description: "Impressum und Anbieterkennzeichnung von Eventoren.",
    changefreq: "yearly",
    priority: 0.2,
    jsonLdType: "WebPage",
  },
  {
    path: "/agb",
    title: "Allgemeine Geschäftsbedingungen | Eventoren",
    description: "Allgemeine Geschäftsbedingungen von Eventoren.",
    changefreq: "yearly",
    priority: 0.2,
    jsonLdType: "WebPage",
  },
] satisfies SeoPage[]
