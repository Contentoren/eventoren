import type { DashScheduleItem } from "../../../model/dashScheduleItemSchema.ts"

import { dashListItemIdCreate } from "./dashListItemIdCreate.ts"

const berlinTimeFormat = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Berlin",
})

function berlinTime(iso: string): string {
  return berlinTimeFormat.format(new Date(iso))
}

/** Erzeugt Programmpunkte aus den Eventzeiten: Einlass (falls gesetzt), Beginn, Ende. Zeiten in Europe/Berlin (HH:mm). */
export function dashScheduleFromEvent(event: {
  doorsAt: string | null
  startsAt: string
  endsAt: string
}): DashScheduleItem[] {
  const items: DashScheduleItem[] = []
  if (event.doorsAt !== null) {
    items.push({ id: dashListItemIdCreate(), time: berlinTime(event.doorsAt), title: "Einlass", detail: "" })
  }
  items.push({ id: dashListItemIdCreate(), time: berlinTime(event.startsAt), title: "Beginn", detail: "" })
  items.push({ id: dashListItemIdCreate(), time: berlinTime(event.endsAt), title: "Ende", detail: "" })
  return items
}
