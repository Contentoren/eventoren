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
  "checkout-loading": {
    title: "Checkout lädt",
    detail: "Ladezustand der Bestellbestätigung anzeigen",
  },
  "checkout-loaded": {
    title: "Checkout geladen",
    detail: "Geladenen Zustand der Bestellbestätigung anzeigen",
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
  "platform-dashboard": {
    title: "Veranstalter-Dashboard",
    detail: "Übersicht, Events, Bestellungen und Finanzen",
  },
  "platform-event": {
    title: "Event verwalten",
    detail: "Tickets, Codes, Bestellungen und Abrechnung",
  },
  "platform-live": {
    title: "Live-Einlass",
    detail: "Check-ins und abgelehnte Scans in Echtzeit",
  },
  "platform-wizard": {
    title: "Event erstellen",
    detail: "Assistent in drei Schritten",
  },
  "platform-onboarding": {
    title: "Veranstalter-Onboarding",
    detail: "Registrierung, Organisation, Angaben und Verträge",
  },
  "platform-box-office": {
    title: "Kassenmodus",
    detail: "Abendkasse am Eingang mit QR-Zahlung",
  },
  "platform-box-office-guest": {
    title: "Abendkasse (Gast)",
    detail: "Ticketkauf am eigenen Handy",
  },
  "customer-organizer-profile": {
    title: "Veranstalterprofil",
    detail: "Öffentliches Profil mit Events und Social Links",
  },
  "customer-organizer-event": {
    title: "Event-Vorschau",
    detail: "Eventseite aus Dashboard-Daten",
  },
  "customer-account": {
    title: "Kundenkonto",
    detail: "Tickets, Bestellungen und Profil",
  },
  "admin-orgs": {
    title: "Organisationen",
    detail: "Veranstalter freigeben, Gebühren und Steuern",
  },
  "admin-payouts": {
    title: "Auszahlungen",
    detail: "Auszahlungen nach Eventende",
  },
  admin: {
    title: "Katalogverwaltung",
    detail: "Event bearbeiten, Ticketprodukte aktualisieren und lokale Änderungen veröffentlichen",
  },
  "admin-orders": {
    title: "Admin-Bestellungen",
    detail: "Alle Ticketbestellungen einsehen, Status prüfen und weitere Einträge nachladen",
  },
  "admin-members": {
    title: "Admin-Mitglieder",
    detail: "Mitgliederliste durchsuchen und Veranstalterrechte direkt verwalten",
  },
  "admin-organizers": {
    title: "Veranstalterverwaltung",
    detail: "Mitglieder mit aktiver Veranstalterrolle einsehen",
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
