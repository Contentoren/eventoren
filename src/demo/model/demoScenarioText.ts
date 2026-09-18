import type { DemoScenario } from "./demoScenarioSchema.js"

type DemoScenarioCopy = { title: string; detail: string }

const scenarioTexts: Partial<Record<DemoScenario["id"], DemoScenarioCopy>> = {
  events: {
    title: "Eventkatalog",
    detail: "Lokalen Katalog durchsuchen und Eventdetails öffnen",
  },
  "events-empty": {
    title: "Leerer Eventkatalog",
    detail: "Produktionszustand ohne passende Events anzeigen",
  },
  "events-error": {
    title: "Eventkatalog-Fehler",
    detail: "Produktionszustand mit Katalogfehler anzeigen",
  },
  "events-booking-success": {
    title: "Buchungsbestätigung",
    detail: "Produktionsbanner anzeigen und schließen",
  },
  "event-detail": {
    title: "Eventdetails & Tickets",
    detail: "Ticketstufen auswählen und ein lokales Event in den Warenkorb legen",
  },
  "event-detail-missing": {
    title: "Fehlendes Event",
    detail: "Produktionszustand für ein nicht gefundenes Event anzeigen",
  },
  cart: {
    title: "Warenkorb",
    detail: "Ticketgruppen prüfen, Mengen ändern und zur Kasse gehen",
  },
  "cart-empty": {
    title: "Leerer Warenkorb",
    detail: "Produktionszustand mit leerem Warenkorb anzeigen",
  },
  checkout: {
    title: "Kasse",
    detail: "Lokalen Gast-Checkout abschließen und Wallet-Ticket anzeigen",
  },
  "checkout-empty": {
    title: "Leere Kasse",
    detail: "Checkout ohne gültige Tickets anzeigen",
  },
  "checkout-error": {
    title: "Checkout-Fehler",
    detail: "Lokalen Fehler beim Abschließen der Kasse anzeigen",
  },
  "order-status-paid": {
    title: "Bestellbestätigung",
    detail: "Bezahlten Status und Wallet-Ticket anzeigen",
  },
  "order-status-pending": {
    title: "Offener Zahlungsstatus",
    detail: "Ausstehende Zahlung und fehlendes Wallet-Ticket anzeigen",
  },
  "order-status-error": {
    title: "Bestellstatus-Fehler",
    detail: "Fehler beim Laden des Produktionszustands anzeigen",
  },
  admin: {
    title: "Katalogverwaltung",
    detail: "Event bearbeiten, Ticketprodukte aktualisieren und lokale Änderungen veröffentlichen",
  },
  "admin-new": {
    title: "Neuer Evententwurf",
    detail: "Produktionseditor mit lokalem neuen Entwurf öffnen",
  },
  "admin-empty": {
    title: "Keine Mitglieder",
    detail: "Mitgliederverwaltung ohne Treffer anzeigen",
  },
  "admin-error": {
    title: "Mitgliederfehler",
    detail: "Fehlerzustand der Produktions-Mitgliederverwaltung anzeigen",
  },
  "admin-unauthorized": {
    title: "Admin-Zugriff verweigert",
    detail: "Produktions-Fallback für fehlende Berechtigung anzeigen",
  },
  "orders-populated": {
    title: "Bestellhistorie",
    detail: "Lokale Bestellungen durchsuchen und Ticketdetails öffnen",
  },
  "orders-empty": {
    title: "Leere Bestellhistorie",
    detail: "Leeren Produktionszustand anzeigen",
  },
  "orders-error": {
    title: "Bestellhistorienfehler",
    detail: "Fehler- und Wiederholungszustand anzeigen",
  },
  "orders-signed-out": {
    title: "Abgemeldete Bestellungen",
    detail: "Anmeldehinweis der Produktionshistorie anzeigen",
  },
  organizer: {
    title: "Veranstalter-Events",
    detail: "Befüllte und leere lokale Veranstalter-Eventlisten anzeigen",
  },
  "organizer-empty": {
    title: "Leere Veranstalter-Events",
    detail: "Leere Produktionsliste des Veranstalterbereichs anzeigen",
  },
  "organizer-event": {
    title: "Veranstalter-Check-in",
    detail: "Tickets suchen und manuelle, simulierte QR- sowie Kamera-Check-ins ausprobieren",
  },
}

export function demoScenarioText(scenario: DemoScenario) {
  const localized = scenarioTexts[scenario.id]
  if (!localized) return { title: scenario.title, detail: scenario.detail }
  return localized
}
