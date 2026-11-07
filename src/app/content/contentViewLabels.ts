/** Article/hub chrome labels in the article language (site header/footer stay German). */
export const contentViewLabels = {
  de: {
    breadcrumbAria: "Brotkrumen-Navigation",
    toc: "Inhalt",
    categoriesAria: "Kategorien",
    readingTime: (minutes: number) => `${minutes} Min. Lesezeit`,
    updatedAt: "Aktualisiert am",
    related: "Weiterlesen",
    empty: "Noch keine Ratgeber veröffentlicht.",
    emptyHint: "Schau bald wieder vorbei – neue Beiträge sind in Arbeit.",
    otherHub: "English guides →",
    translation: "Read in English",
    intro:
      "Hier findest du praxisnahe Ratgeber für Veranstalter in Deutschland, Österreich und der Schweiz: vom Online-Ticketverkauf über den Einlass per QR-Code bis zu GEMA, Steuern und Recht. Jeder Beitrag ist auf dem Stand 2026/27 und liefert konkrete Zahlen, Checklisten und Beispielrechnungen. Wähle eine Kategorie oder starte mit dem neuesten Artikel.",
    hubCtaText: "Tickets für dein Event verkaufen? 3,9 % + 0,49 € pro Ticket, keine Grundgebühr.",
    hubCtaAction: "Veranstalter werden",
  },
  en: {
    breadcrumbAria: "Breadcrumb",
    toc: "Contents",
    categoriesAria: "Categories",
    readingTime: (minutes: number) => `${minutes} min read`,
    updatedAt: "Updated",
    related: "Related guides",
    empty: "No guides published yet.",
    emptyHint: "Check back soon – new guides are on their way.",
    otherHub: "Deutsche Ratgeber →",
    translation: "Auf Deutsch lesen",
    intro:
      "Practical guides for event organisers across Europe: selling tickets online, running QR check-in at the door, pricing your event and staying compliant with VAT, GDPR and EU rules. Every guide is updated for 2026/27 and comes with real figures, checklists and worked examples. Pick a category below or start with the latest guide.",
    hubCtaText: "Selling tickets for your event? 3.9% + €0.49 per ticket, no base fee.",
    hubCtaAction: "Become an organiser",
  },
} as const
