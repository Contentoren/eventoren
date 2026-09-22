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
  | "groupCustomerTitle"
  | "groupCustomerDescription"
  | "groupCustomerEntry"
  | "groupAdminTitle"
  | "groupAdminDescription"
  | "groupAdminEntry"
  | "groupSharedTitle"
  | "groupSharedDescription"
  | "groupSharedEntry"
  | "quickEntriesTitle"
  | "quickEntryCustomer"
  | "quickEntryAdmin"
  | "quickEntryScanner"

type DemoCheckoutTextKey = Extract<DemoTextKey, `checkout${string}`>
type DemoUiTextKey = Exclude<DemoTextKey, DemoCheckoutTextKey>

const texts: Record<DemoUiTextKey, string> = {
  shellTitle: "Eventoren-Demos",
  shellDetail: "Lokale UI-Demos",
  shellDirectory: "Demo-Verzeichnis",
  directoryEyebrow: "Interaktive Anwendungs-Demos",
  directoryTitle: "Anwendung lokal ausprobieren",
  directoryDescription:
    "Diese Ansichten verwenden ausschließlich Fixture-Daten und Browserstatus. Erkunde die Anwendung ohne einen Dienst zu konfigurieren.",
  open: "Demo öffnen →",
  navigationEyebrow: "Mobiles Menü",
  navigationTitle: "Navigationsschublade",
  navigationDescription:
    "Der echte mobile Navigationsdialog der Produktionsseite mit ausschließlich lokalen Demo-Zielen.",
  navigationOpen: "Menü öffnen",
  controlsButton: "Demo",
  controlsTitle: "Demo-Navigation",
  controlsClose: "Schließen",
  controlsDirectory: "Zum Demo-Verzeichnis",
  groupCustomerTitle: "Kunden",
  groupCustomerDescription: "Ticketkauf, Evententdeckung, Warenkorb, Kasse und persönliche Bestellhistorie.",
  groupCustomerEntry: "Zum Eventkatalog",
  groupAdminTitle: "Administration (inkl. Ticket-Scan)",
  groupAdminDescription: "Eventkatalogverwaltung, Bestellungen, Mitgliederverwaltung und Einlasskontrolle.",
  groupAdminEntry: "Zur Katalogverwaltung",
  groupSharedTitle: "Gemeinsame Beispiele",
  groupSharedDescription: "Kontakt, FAQ, Anmeldeabläufe und statische Informationsseiten.",
  groupSharedEntry: "Zu Kontakt & FAQ",
  quickEntriesTitle: "Direkte Einstiege",
  quickEntryCustomer: "Kunden-Flow",
  quickEntryAdmin: "Administration",
  quickEntryScanner: "Ticket-Scanner",
}

const checkoutTexts: Record<DemoCheckoutTextKey, string> = {
  checkoutOrderEyebrow: "Lokale Demo-Bestellung",
  checkoutCompletedTitle: "Zahlung abgeschlossen",
  checkoutCompletedDescription:
    "Die Bestätigung wurde ausschließlich aus Fixture-Daten erzeugt. Es wurden weder Authentifizierung noch Zahlung oder Backend aufgerufen.",
  checkoutDiscoverEvents: "Weitere Events entdecken",
  checkoutCartLink: "Zum Demo-Warenkorb",
  checkoutTitle: "Kasse",
  checkoutEmptyCart: "Dein Demo-Warenkorb enthält keine gültigen Tickets.",
  checkoutCartLinkShort: "Zum Demo-Warenkorb",
  checkoutPaymentDescription:
    "Die Demo-Zahlung wird lokal simuliert. Es werden keine Zahlungsanbieter, Authentifizierung oder Serverdaten aufgerufen.",
  checkoutSubmitLabel: "Demo-Bestellung abschließen",
  checkoutLegalRequired: "Bitte bestätige die Demo-Bedingungen.",
  checkoutContactRequired: "Bitte ergänze deine Kontaktdaten für die Demo-Bestellung.",
}

export function demoText(key: DemoTextKey): string {
  if (key in checkoutTexts) {
    return checkoutTexts[key as DemoCheckoutTextKey]
  }
  return texts[key as DemoUiTextKey]
}
