import type { DashMessage } from "../../model/dashMessageSchema.ts"

import { dashSeedTimeAt } from "./dashSeedTimeAt.ts"

export function dashSeedMessages(now: Date): DashMessage[] {
  return [
    {
      id: "msg-indie-erinnerung",
      eventId: "ev-indie-night",
      kind: "erinnerung",
      audience: { type: "alle", ticketTypeIds: [] },
      subject: "Morgen ist es so weit: Indie Night im Lindenhof",
      body: "Hallo {vorname},\n\nmorgen startet die **Indie Night** im Kulturhaus Lindenhof. Einlass ist ab 19:00 Uhr – komm früh, die ersten 100 Gäste bekommen einen Sticker.\n\nAnfahrt: Tram 9 bis Lindenhofstraße, dann 3 Min. zu Fuß. Dein Ticket findest du im Anhang, zusätzlich liegt ein Kalendereintrag (.ics) bei.\n\nBis morgen!\nDein Lindenhof-Team",
      status: "gesendet",
      scheduledAt: dashSeedTimeAt(now, -1, "20:00"),
      sentAt: dashSeedTimeAt(now, -1, "20:00"),
      recipientCount: 430,
      openRateBps: 6800,
    },
    {
      id: "msg-jazz-programm",
      eventId: "ev-jazz-wein",
      kind: "aenderung",
      audience: { type: "alle", ticketTypeIds: [] },
      subject: "Programmänderung bei Jazz & Wein",
      body: "Hallo {vorname},\n\nkleine Änderung bei **Jazz & Wein** am {datum}: Das zweite Set beginnt 15 Minuten später, damit bleibt mehr Zeit für die Verkostung.\n\nDein Ticket behält volle Gültigkeit. Wir freuen uns auf dich!",
      status: "entwurf",
      scheduledAt: null,
      sentAt: null,
      recipientCount: 0,
      openRateBps: null,
    },
    {
      id: "msg-winter-info",
      eventId: "ev-winterball",
      kind: "info",
      audience: { type: "alle", ticketTypeIds: [] },
      subject: "Winterball: Buffet, Dresscode und Ablauf",
      body: "Hallo {vorname},\n\nder **Winterball** rückt näher! Hier die wichtigsten Infos:\n\n- Einlass ab 18:00 Uhr mit Sektempfang\n- Buffet ab 20:00 Uhr im Gartensaal\n- Dresscode: festlich\n\nBis bald im Lindenhof!",
      status: "geplant",
      scheduledAt: dashSeedTimeAt(now, 63, "18:00"),
      sentAt: null,
      recipientCount: 0,
      openRateBps: null,
    },
  ]
}
