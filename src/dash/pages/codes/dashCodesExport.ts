import type { DashCode } from "../../model/dashCodeSchema.ts"
import type { DashTicketType } from "../../model/dashTicketTypeSchema.ts"
import { dashCentsFormat } from "../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import { dashCodeValidityText, dashCodeValueText } from "./dashCodeText.ts"

/** Baut CSV-Zeilen für den Code-Export (reine Daten, kein Download). */
export function dashCodesExportRows(
  codes: DashCode[],
  ticketTypes: DashTicketType[],
): { header: string[]; rows: (string | number | null)[][] } {
  const header = ["Code", "Art", "Wert", "Gilt für", "Genutzt", "Limit", "Gültig von", "Gültig bis", "Aktiv"]
  const rows = codes.map((code): (string | number | null)[] => {
    const giltFuer =
      code.ticketTypeIds.length === 0
        ? "Alle"
        : code.ticketTypeIds.map((id) => ticketTypes.find((type) => type.id === id)?.name ?? id).join(", ")
    return [
      code.code,
      code.kind === "rabatt" ? "Rabatt" : "Zugang",
      code.kind === "rabatt"
        ? code.discount?.type === "prozent"
          ? `${(code.discount.value / 100).toLocaleString("de-DE")} %`
          : dashCentsFormat(code.discount?.value ?? 0)
        : dashCodeValueText(code, ticketTypes),
      giltFuer,
      code.usedTickets,
      code.maxTickets,
      code.validFrom ? dashDateFormat(code.validFrom, "datum") : null,
      code.validUntil ? dashDateFormat(code.validUntil, "datum") : null,
      code.active ? "Ja" : "Nein",
    ]
  })
  void dashCodeValidityText
  return { header, rows }
}
