/** Erstattungs-/Stornogründe (SegmentedControl bzw. Auswahl teilen sich die Liste). */
export const dashOrderReasonOptions = [
  { value: "kunde-storniert", label: "Kunde storniert" },
  { value: "event-geaendert", label: "Event geändert" },
  { value: "kulanz", label: "Kulanz" },
  { value: "doppelte-bestellung", label: "Doppelte Bestellung" },
  { value: "sonstiges", label: "Sonstiges" },
] as const

export type DashOrderReason = (typeof dashOrderReasonOptions)[number]["value"]

export function dashOrderReasonLabel(value: string): string {
  return dashOrderReasonOptions.find((option) => option.value === value)?.label ?? value
}
