import type { DashCode } from "../../model/dashCodeSchema.ts"
import type { DashTicketType } from "../../model/dashTicketTypeSchema.ts"
import { dashCentsFormat } from "../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../model/dashDateFormat.ts"

/** Anzeige-Wert eines Codes: „10 %“, „5,00 €“ oder „schaltet frei: Presse“. */
export function dashCodeValueText(code: DashCode, ticketTypes: DashTicketType[]): string {
  if (code.kind === "rabatt") {
    if (!code.discount) return "Rabatt"
    if (code.discount.type === "prozent") return `${(code.discount.value / 100).toLocaleString("de-DE")} %`
    return dashCentsFormat(code.discount.value)
  }
  const names = code.ticketTypeIds
    .map((id) => ticketTypes.find((type) => type.id === id)?.name)
    .filter((name): name is string => Boolean(name))
  if (names.length === 0) return "schaltet frei: Ticketart"
  return `schaltet frei: ${names.join(", ")}`
}

/** Nutzungstext „34 / 60“ oder „34 / ∞“. */
export function dashCodeUsageText(code: DashCode): string {
  return code.maxTickets === null ? `${code.usedTickets} / ∞` : `${code.usedTickets} / ${code.maxTickets}`
}

/** Gültigkeitstext: Zeitraum oder „Immer“. */
export function dashCodeValidityText(code: Pick<DashCode, "validFrom" | "validUntil">): string {
  if (!code.validFrom && !code.validUntil) return "Immer"
  if (code.validFrom && code.validUntil)
    return `${dashDateFormat(code.validFrom, "datum")} – ${dashDateFormat(code.validUntil, "datum")}`
  if (code.validFrom) return `ab ${dashDateFormat(code.validFrom, "datum")}`
  return `bis ${dashDateFormat(code.validUntil ?? "", "datum")}`
}

/** Käufer-Vorschau für das Sheet: Erfolgszeile wie im Checkout. */
export function dashCodeBuyerPreview(code: string, valueText: string): string {
  return `${code} · ${valueText}`
}
