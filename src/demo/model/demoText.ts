import { language } from "../../app/i18n/language.ts"
import { languageSignal } from "../../app/i18n/languageSignal.ts"

type DemoTextKey =
  | "shellTitle"
  | "shellDetail"
  | "shellDirectory"
  | "directoryEyebrow"
  | "directoryTitle"
  | "directoryDescription"
  | "open"
  | "checkoutOrderEyebrow"
  | "checkoutCompletedTitle"
  | "checkoutCompletedDescription"
  | "checkoutDiscoverEvents"
  | "checkoutCartLink"
  | "checkoutTitle"
  | "checkoutEmptyCart"
  | "checkoutCartLinkShort"
  | "checkoutPaymentDescription"
  | "checkoutSubmitLabel"
  | "checkoutLegalRequired"
  | "checkoutContactRequired"
  | "navigationEyebrow"
  | "navigationTitle"
  | "navigationDescription"
  | "navigationOpen"
  | "controlsButton"
  | "controlsTitle"
  | "controlsClose"
  | "controlsDirectory"

const texts: Record<DemoTextKey, { de: string; en: string }> = {
  shellTitle: { de: "Eventoren-Demos", en: "Eventoren demos" },
  shellDetail: { de: "Lokale UI-Demos", en: "Local UI demos" },
  shellDirectory: { de: "Demo-Verzeichnis", en: "Demo directory" },
  directoryEyebrow: { de: "Interaktive Anwendungs-Demos", en: "Interactive application demos" },
  directoryTitle: { de: "Anwendung lokal ausprobieren", en: "Try the application locally" },
  directoryDescription: {
    de: "Diese Ansichten verwenden ausschließlich Fixture-Daten und Browserstatus. Erkunde die Anwendung ohne einen Dienst zu konfigurieren.",
    en: "These screens use fixture data and browser state only. Use the navigation to explore a realistic application surface without configuring a service.",
  },
  open: { de: "Demo öffnen →", en: "Open demo →" },
  checkoutOrderEyebrow: { de: "Lokale Demo-Bestellung", en: "Local demo order" },
  checkoutCompletedTitle: { de: "Zahlung abgeschlossen", en: "Payment completed" },
  checkoutCompletedDescription: {
    de: "Die Bestätigung wurde ausschließlich aus Fixture-Daten erzeugt. Es wurden weder Authentifizierung noch Zahlung oder Backend aufgerufen.",
    en: "This confirmation was generated from fixture data only. No authentication, payment, or backend was used.",
  },
  checkoutDiscoverEvents: { de: "Weitere Events entdecken", en: "Discover more events" },
  checkoutCartLink: { de: "Zum Demo-Warenkorb", en: "Back to demo cart" },
  checkoutTitle: { de: "Kasse", en: "Checkout" },
  checkoutEmptyCart: {
    de: "Dein Demo-Warenkorb enthält keine gültigen Tickets.",
    en: "Your demo cart contains no valid tickets.",
  },
  checkoutCartLinkShort: { de: "Zum Demo-Warenkorb", en: "Back to demo cart" },
  checkoutPaymentDescription: {
    de: "Die Demo-Zahlung wird lokal simuliert. Es werden keine Zahlungsanbieter, Authentifizierung oder Serverdaten aufgerufen.",
    en: "Demo payment is simulated locally. No payment provider, authentication, or server data is used.",
  },
  checkoutSubmitLabel: { de: "Demo-Bestellung abschließen", en: "Complete demo order" },
  checkoutLegalRequired: { de: "Bitte bestätige die Demo-Bedingungen.", en: "Please accept the demo terms." },
  checkoutContactRequired: {
    de: "Bitte ergänze deine Kontaktdaten für die Demo-Bestellung.",
    en: "Please complete your contact details for the demo order.",
  },
  navigationEyebrow: { de: "Mobiles Menü", en: "Mobile menu" },
  navigationTitle: { de: "Navigationsschublade", en: "Navigation drawer" },
  navigationDescription: {
    de: "Der echte mobile Navigationsdialog der Produktionsseite mit ausschließlich lokalen Demo-Zielen.",
    en: "The production mobile navigation drawer with demo-local destinations only.",
  },
  navigationOpen: { de: "Menü öffnen", en: "Open menu" },
  controlsButton: { de: "Demo", en: "Demo" },
  controlsTitle: { de: "Demo-Navigation", en: "Demo navigation" },
  controlsClose: { de: "Schließen", en: "Close" },
  controlsDirectory: { de: "Zum Demo-Verzeichnis", en: "Demo directory" },
}

export function demoText(key: DemoTextKey): string {
  const text = texts[key]
  return languageSignal.get() === language.de ? text.de : text.en
}
