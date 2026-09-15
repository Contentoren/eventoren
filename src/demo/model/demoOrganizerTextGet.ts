import type { Language } from "../../app/i18n/language.ts"

export function demoOrganizerTextGet(language: Language) {
  if (language === "de") {
    return {
      scenariosTitle: "Fixture-Szenarien",
      scenariosDescription: "Wechsle zwischen einer befüllten und einer leeren Eventliste.",
      populated: "Befüllte Liste",
      empty: "Leere Liste",
      simulationTitle: "Scanner-Simulation",
      simulationDescription:
        "Die Simulation nutzt denselben Check-in-Ablauf wie die Kamera, aber ausschließlich lokale Fixture-Codes.",
      success: "Erfolg scannen",
      duplicate: "Duplikat scannen",
      wrongEvent: "Falsches Event",
      unknown: "Unbekannter QR-Code",
      unpaid: "Unbezahlt scannen",
      cancelled: "Storniert scannen",
      cameraDenied: "Kamerazugriff verweigern",
      realCameraHint: "„Kamera starten“ verwendet, sofern verfügbar, die echte gemeinsame QR-Kamera-Komponente.",
      resetHint:
        "Nach einem erfolgreichen Scan ist das Ticket ausgewählt. Setze seinen Check-in unten zurück und scanne es erneut.",
    }
  }
  return {
    scenariosTitle: "Fixture scenarios",
    scenariosDescription: "Switch between a populated and an empty event list.",
    populated: "Populated list",
    empty: "Empty list",
    simulationTitle: "Scanner simulation",
    simulationDescription: "The simulation uses the same check-in flow as the camera, with local fixture codes only.",
    success: "Scan success",
    duplicate: "Scan duplicate",
    wrongEvent: "Wrong event",
    unknown: "Unknown QR code",
    unpaid: "Scan unpaid",
    cancelled: "Scan cancelled",
    cameraDenied: "Deny camera access",
    realCameraHint: "“Start camera” uses the real shared QR camera component where available.",
    resetHint: "After a successful scan, the ticket is selected. Reset its check-in below, then scan it again.",
  }
}
