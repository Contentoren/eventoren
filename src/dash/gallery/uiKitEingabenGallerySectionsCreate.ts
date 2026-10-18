import { mdiAlertOutline } from "@adaptive-ds/mdi/mdiAlertOutline.js"
import { mdiCalendarMonthOutline } from "@adaptive-ds/mdi/mdiCalendarMonthOutline.js"
import { mdiEyeOutline } from "@adaptive-ds/mdi/mdiEyeOutline.js"
import { mdiFilterVariant } from "@adaptive-ds/mdi/mdiFilterVariant.js"
import { mdiTagOutline } from "@adaptive-ds/mdi/mdiTagOutline.js"

export function uiKitEingabenGallerySectionsCreate() {
  return {
    filterChips: [
      { id: "alle", label: "Alle", icon: mdiFilterVariant, count: 128 },
      { id: "bezahlt", label: "Bezahlt", count: 96 },
      { id: "offen", label: "Offen", count: 12, tone: "warning" as const },
      { id: "storniert", label: "Storniert", count: 20, tone: "danger" as const },
      { id: "entwurf", label: "Entwürfe", icon: mdiEyeOutline },
    ],
    tabItems: [
      { id: "aktuell", label: "Aktuell", icon: mdiCalendarMonthOutline, count: 4 },
      { id: "entwuerfe", label: "Entwürfe", count: 2 },
      { id: "vergangen", label: "Vergangen", count: 18 },
      { id: "vorlagen", label: "Vorlagen", icon: mdiTagOutline },
    ],
    zeitraumOptions: [
      { value: "7", label: "7 Tage" },
      { value: "30", label: "30 Tage" },
      { value: "365", label: "12 Monate" },
    ],
    ansichtOptions: [
      { value: "liste", label: "Liste" },
      { value: "kacheln", label: "Kacheln" },
    ],
    stepperSteps: [
      { id: "basis", label: "Basis", description: "Titel, Datum, Ort" },
      { id: "tickets", label: "Tickets", description: "Arten und Phasen" },
      { id: "pruefen", label: "Prüfen", description: "Kontrolle und Start" },
    ],
    alertIcon: mdiAlertOutline,
  }
}
