import type { DemoScenario } from "./demoScenarioSchema.js"
import { language } from "../../app/i18n/language.ts"
import { languageSignal } from "../../app/i18n/languageSignal.ts"

const scenarioTexts: Partial<
  Record<DemoScenario["id"], { de: { title: string; detail: string }; en: { title: string; detail: string } }>
> = {
  directory: {
    de: { title: "Demo-Verzeichnis", detail: "Lokale Anwendungs-Fixtures durchsuchen" },
    en: { title: "Demo directory", detail: "Browse the local application fixture" },
  },
  events: {
    de: { title: "Eventkatalog", detail: "Lokalen Katalog durchsuchen und Eventdetails öffnen" },
    en: { title: "Event catalog", detail: "Search a local catalog and open an event detail workflow" },
  },
  "events-empty": {
    de: { title: "Leerer Eventkatalog", detail: "Produktionszustand ohne passende Events anzeigen" },
    en: { title: "Empty event catalog", detail: "Review the production catalog empty state" },
  },
  "events-error": {
    de: { title: "Eventkatalog-Fehler", detail: "Produktionszustand mit Katalogfehler anzeigen" },
    en: { title: "Event catalog error", detail: "Review the production catalog error state" },
  },
  "events-booking-success": {
    de: { title: "Buchungsbestätigung", detail: "Produktionsbanner anzeigen und schließen" },
    en: { title: "Booking success banner", detail: "Review and dismiss the production booking success state" },
  },
  "event-detail": {
    de: {
      title: "Eventdetails & Tickets",
      detail: "Ticketstufen auswählen und ein lokales Event in den Warenkorb legen",
    },
    en: { title: "Event detail & tickets", detail: "Choose ticket tiers and add a local event to the cart" },
  },
  "event-detail-missing": {
    de: { title: "Fehlendes Event", detail: "Produktionszustand für ein nicht gefundenes Event anzeigen" },
    en: { title: "Missing event detail", detail: "Review the production missing-event state" },
  },
  cart: {
    de: { title: "Warenkorb", detail: "Ticketgruppen prüfen, Mengen ändern und zur Kasse gehen" },
    en: { title: "Cart", detail: "Review ticket groups, adjust quantities and continue to checkout" },
  },
  "cart-empty": {
    de: { title: "Leerer Warenkorb", detail: "Produktionszustand mit leerem Warenkorb anzeigen" },
    en: { title: "Empty cart", detail: "Review the production empty-cart state" },
  },
  checkout: {
    de: { title: "Kasse", detail: "Lokalen Gast-Checkout abschließen und Wallet-Ticket anzeigen" },
    en: { title: "Checkout", detail: "Complete a local guest checkout and view the wallet-ticket result" },
  },
  "checkout-empty": {
    de: { title: "Leere Kasse", detail: "Checkout ohne gültige Tickets anzeigen" },
    en: { title: "Empty checkout", detail: "Review checkout without valid tickets" },
  },
  "checkout-error": {
    de: { title: "Checkout-Fehler", detail: "Lokalen Fehler beim Abschließen der Kasse anzeigen" },
    en: { title: "Checkout error", detail: "Review a local checkout action failure" },
  },
  "order-status-paid": {
    de: { title: "Bestellbestätigung", detail: "Bezahlten Status und Wallet-Ticket anzeigen" },
    en: { title: "Order confirmation", detail: "Review a paid order status and wallet ticket" },
  },
  "order-status-pending": {
    de: { title: "Offener Zahlungsstatus", detail: "Ausstehende Zahlung und fehlendes Wallet-Ticket anzeigen" },
    en: { title: "Pending order status", detail: "Review a pending payment and unavailable pass" },
  },
  "order-status-error": {
    de: { title: "Bestellstatus-Fehler", detail: "Fehler beim Laden des Produktionszustands anzeigen" },
    en: { title: "Order status error", detail: "Review the production order lookup error state" },
  },
  admin: {
    de: {
      title: "Katalogverwaltung",
      detail: "Event bearbeiten, Ticketprodukte aktualisieren und lokale Änderungen veröffentlichen",
    },
    en: { title: "Catalog administration", detail: "Edit an event, update ticket products and publish local changes" },
  },
  "admin-new": {
    de: { title: "Neuer Evententwurf", detail: "Produktionseditor mit lokalem neuen Entwurf öffnen" },
    en: { title: "New event editor", detail: "Open the production editor with a new local event draft" },
  },
  "admin-empty": {
    de: { title: "Keine Mitglieder", detail: "Mitgliederverwaltung ohne Treffer anzeigen" },
    en: { title: "Empty member management", detail: "Review admin member management with no matching members" },
  },
  "admin-error": {
    de: { title: "Mitgliederfehler", detail: "Fehlerzustand der Produktions-Mitgliederverwaltung anzeigen" },
    en: { title: "Member management error", detail: "Review the production member loading error state" },
  },
  "admin-unauthorized": {
    de: { title: "Admin-Zugriff verweigert", detail: "Produktions-Fallback für fehlende Berechtigung anzeigen" },
    en: { title: "Unauthorized admin", detail: "Review the production admin access fallback" },
  },
  contact: {
    de: { title: "Kontakt & FAQ", detail: "Lokales Kontaktformular und Produktions-FAQs ausprobieren" },
    en: { title: "Contact & FAQ", detail: "Complete the local contact form and expand production FAQs" },
  },
  "contact-submitted": {
    de: { title: "Gesendeter Kontakt", detail: "Bestätigungszustand des Produktionsformulars anzeigen" },
    en: { title: "Submitted contact", detail: "Review the production contact confirmation state" },
  },
  "navigation-menu": {
    de: { title: "Mobiles Navigationsmenü", detail: "Produktionsdialog mit Demo-Zielen anzeigen" },
    en: {
      title: "Mobile navigation drawer",
      detail: "Review the production mobile navigation modal with demo destinations",
    },
  },
  "auth-sign-in": {
    de: { title: "Anmeldung", detail: "Lokale Passwort-, E-Mail-Code- und SSO-Einstiege anzeigen" },
    en: { title: "Sign-in", detail: "Use the local password, email-code or SSO sign-in entry points" },
  },
  "auth-sign-in-error": {
    de: { title: "Anmeldefehler", detail: "Fehlerzustand der Produktionsanmeldung anzeigen" },
    en: { title: "Sign-in error", detail: "Review the production sign-in error state" },
  },
  "auth-otp": {
    de: { title: "Einmalcode", detail: "Lokalen E-Mail-Anmeldecode eingeben" },
    en: { title: "One-time code", detail: "Enter a local email sign-in code" },
  },
  "auth-otp-error": {
    de: { title: "Einmalcode-Fehler", detail: "Fehlerzustand der Produktions-OTP-Eingabe anzeigen" },
    en: { title: "One-time code error", detail: "Review the production OTP error state" },
  },
  "orders-populated": {
    de: { title: "Bestellhistorie", detail: "Lokale Bestellungen durchsuchen und Ticketdetails öffnen" },
    en: { title: "Order history", detail: "Browse local order history and open ticket details" },
  },
  "orders-empty": {
    de: { title: "Leere Bestellhistorie", detail: "Leeren Produktionszustand anzeigen" },
    en: { title: "Empty order history", detail: "Review the production empty order history state" },
  },
  "orders-error": {
    de: { title: "Bestellhistorienfehler", detail: "Fehler- und Wiederholungszustand anzeigen" },
    en: { title: "Order history error", detail: "Review the production order history error and retry state" },
  },
  "orders-signed-out": {
    de: { title: "Abgemeldete Bestellungen", detail: "Anmeldehinweis der Produktionshistorie anzeigen" },
    en: { title: "Signed-out order history", detail: "Review the production sign-in prompt for order history" },
  },
  organizer: {
    de: { title: "Veranstalter-Events", detail: "Befüllte und leere lokale Veranstalter-Eventlisten anzeigen" },
    en: { title: "Organizer events", detail: "Browse populated and empty local organizer event lists" },
  },
  "organizer-empty": {
    de: { title: "Leere Veranstalter-Events", detail: "Leere Produktionsliste des Veranstalterbereichs anzeigen" },
    en: { title: "Empty organizer events", detail: "Review the production organizer empty-list state" },
  },
  "organizer-event": {
    de: {
      title: "Veranstalter-Check-in",
      detail: "Tickets suchen und manuelle, simulierte QR- sowie Kamera-Check-ins ausprobieren",
    },
    en: {
      title: "Organizer check-in",
      detail: "Search tickets and try manual, simulated QR and camera check-in states",
    },
  },
}

export function demoScenarioText(scenario: DemoScenario) {
  const localized = scenarioTexts[scenario.id]
  if (!localized) return { title: scenario.title, detail: scenario.detail }
  return localized[languageSignal.get() === language.de ? "de" : "en"]
}
