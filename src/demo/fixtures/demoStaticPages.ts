import type { ContentEntry } from "@adaptive-ds/website-content-pipeline"
import type { ContentHtml } from "../../app/content/contentHtml.ts"

const contentEntries = [
  {
    id: "2026-09-03-events-sicher-planen",
    slug: "events-sicher-planen",
    path: "/ratgeber/events-sicher-planen",
    contentPath: "./public/ratgeber/2026-09-03-events-sicher-planen.md",
    image: null,
    imagePath: null,
    title: "Events sicher planen: Die wichtigsten Schritte",
    description: "Von der ersten Idee bis zum Einlass: ein kompakter Überblick für Veranstalter:innen.",
    publishedAt: "2026-09-03",
    updatedAt: "2026-09-03",
    author: "Eventoren Redaktion",
    imageAlt: null,
  },
  {
    id: "2026-08-21-ticketverkauf-starten",
    slug: "ticketverkauf-starten",
    path: "/ratgeber/ticketverkauf-starten",
    contentPath: "./public/ratgeber/2026-08-21-ticketverkauf-starten.md",
    image: null,
    imagePath: null,
    title: "Ticketverkauf starten: Eine gute Vorbereitung",
    description: "Welche Informationen, Ticketstufen und Abläufe vor dem Verkaufsstart feststehen sollten.",
    publishedAt: "2026-08-21",
    updatedAt: "2026-08-21",
    author: "Eventoren Redaktion",
    imageAlt: null,
  },
] satisfies readonly ContentEntry[]

const contentHtml: Readonly<Record<string, ContentHtml>> = {
  "./public/ratgeber/2026-09-03-events-sicher-planen.md": {
    html: '<h2 id="vorbereitung">Mit der Vorbereitung beginnen</h2><p>Ein klarer Ablauf, belastbare Informationen und erreichbare Ansprechpersonen schaffen die Grundlage für einen entspannten Veranstaltungstag.</p><h2 id="einlass">Den Einlass mitdenken</h2><p>Plane Ticketprüfung, Beschilderung und mögliche Rückfragen so, dass dein Team auch bei großem Andrang handlungsfähig bleibt.</p>',
    headings: [
      { id: "vorbereitung", text: "Mit der Vorbereitung beginnen", depth: 2 },
      { id: "einlass", text: "Den Einlass mitdenken", depth: 2 },
    ],
    publicPath: "/ratgeber/events-sicher-planen",
  },
  "./public/ratgeber/2026-08-21-ticketverkauf-starten.md": {
    html: '<h2 id="angebot">Das Angebot verständlich beschreiben</h2><p>Gäste sollten auf einen Blick erkennen, wann und wo ein Event stattfindet und welche Ticketstufe zu ihnen passt.</p><h2 id="verkaufsstart">Den Verkaufsstart vorbereiten</h2><p>Prüfe Preise, Kontingente und die Kommunikation vor dem Start in einem lokalen Testlauf.</p>',
    headings: [
      { id: "angebot", text: "Das Angebot verständlich beschreiben", depth: 2 },
      { id: "verkaufsstart", text: "Den Verkaufsstart vorbereiten", depth: 2 },
    ],
    publicPath: "/ratgeber/ticketverkauf-starten",
  },
}

export const demoStaticPages = {
  content: { entries: contentEntries, html: contentHtml },
  legal: {
    impressum:
      "<h1>Impressum</h1><p><strong>Eventoren GmbH</strong><br>Musterstraße 123<br>10115 Berlin</p><h2>Kontakt</h2><p>partner@eventoren.de<br>+49 (0) 30 12345678</p>",
    datenschutz:
      "<h1>Datenschutzerklärung</h1><p>Diese Demo zeigt die veröffentlichte Datenschutzseite mit lokalen Fixture-Daten.</p><h2>Deine Rechte</h2><p>Du kannst Auskunft, Berichtigung oder Löschung deiner personenbezogenen Daten verlangen.</p>",
    privacy: "<h1>Privacy Policy</h1><p>This local demo fixture describes how Eventoren handles personal data.</p>",
    terms:
      "<h1>Terms of Service</h1><p>This local demo fixture describes the terms that apply to the Eventoren website.</p>",
    agb: {
      title: "[Platzhalter] Allgemeine Geschäftsbedingungen (AGB)",
      html: "<blockquote><p><strong>Hinweis / Disclaimer:</strong> Dies ist ein lokaler Platzhalter für die AGB-Demo.</p></blockquote><h2>1. Geltungsbereich und Vertragsgegenstand</h2><p>Diese AGB gelten für die Nutzung der Plattform Eventoren sowie für Ticketkäufe und damit verbundene Dienstleistungen.</p><h2>2. Ticketkauf</h2><p>Preise, Gebühren und Ticketinformationen werden vor Abschluss des Bestellvorgangs transparent angezeigt.</p>",
    },
  },
} as const
