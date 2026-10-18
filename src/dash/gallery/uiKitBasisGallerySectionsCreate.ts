import { mdiCalendarPlus } from "@adaptive-ds/mdi/mdiCalendarPlus.js"
import { mdiCartOutline } from "@adaptive-ds/mdi/mdiCartOutline.js"
import { mdiChartLine } from "@adaptive-ds/mdi/mdiChartLine.js"
import { mdiCheckCircleOutline } from "@adaptive-ds/mdi/mdiCheckCircleOutline.js"
import { mdiCurrencyEur } from "@adaptive-ds/mdi/mdiCurrencyEur.js"
import { mdiEyeOutline } from "@adaptive-ds/mdi/mdiEyeOutline.js"
import { mdiInboxOutline } from "@adaptive-ds/mdi/mdiInboxOutline.js"
import { mdiInformationOutline } from "@adaptive-ds/mdi/mdiInformationOutline.js"
import { mdiLockOutline } from "@adaptive-ds/mdi/mdiLockOutline.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { mdiTicketPercentOutline } from "@adaptive-ds/mdi/mdiTicketPercentOutline.js"
import { mdiTrendingUp } from "@adaptive-ds/mdi/mdiTrendingUp.js"

export function uiKitBasisGallerySectionsCreate() {
  return {
    avatarNames: ["Mara Lindner", "Lea Schneider", "Jonas Weber", "A", "Kulturhaus Lindenhof", "Abikur IKG 2027"],
    progressValues: [
      { value: 312, max: 431, label: "Einlassfortschritt" },
      { value: 0, max: 100, label: "Noch nichts verkauft" },
      { value: 75, max: 100, label: "Drei Viertel verkauft" },
      { value: 150, max: 100, label: "Überbucht (wird begrenzt)" },
    ],
    emptyStates: [
      {
        icon: mdiCalendarPlus,
        title: "Erstelle dein erstes Event",
        description: "Lege Titel, Datum und Tickets in wenigen Minuten an.",
      },
      {
        icon: mdiInboxOutline,
        title: "Keine Treffer",
        description: "Passe die Suche an oder setze die Filter zurück.",
      },
      {
        icon: mdiTicketPercentOutline,
        title: "Noch keine Codes",
        description: "Erstelle einen Rabatt- oder Zugangscode.",
      },
    ],
  }
}

export const uiKitBasisGalleryIcons = {
  calendarPlus: mdiCalendarPlus,
  cart: mdiCartOutline,
  chartLine: mdiChartLine,
  checkCircle: mdiCheckCircleOutline,
  currency: mdiCurrencyEur,
  eye: mdiEyeOutline,
  inbox: mdiInboxOutline,
  info: mdiInformationOutline,
  lock: mdiLockOutline,
  plus: mdiPlus,
  ticket: mdiTicketOutline,
  ticketPercent: mdiTicketPercentOutline,
  trendingUp: mdiTrendingUp,
}
