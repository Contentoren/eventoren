import type { DashScheduleItem } from "../../../model/dashScheduleItemSchema.ts"

/** Sortiert Programmpunkte stabil nach Uhrzeit (HH:mm). Pure: neues Array, Eingabe unverändert. */
export function dashScheduleSort(items: DashScheduleItem[]): DashScheduleItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.time.localeCompare(b.item.time) || a.index - b.index)
    .map((entry) => entry.item)
}
