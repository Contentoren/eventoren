import { createResult, createResultError, type Result } from "#result"

import type { DashCode } from "../../../model/dashCodeSchema.ts"
import { dashCodeGenerate } from "../../../model/dashCodeGenerate.ts"
import { dashRandomCreate } from "../../../model/dashRandomCreate.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export type DashCodeBulkCreateInput = {
  eventId: string
  prefix: string
  count: number
  kind: "rabatt" | "zugang"
  discount: { type: "prozent" | "betrag"; value: number } | null
  ticketTypeIds: string[]
  maxTickets: number | null
  validFrom: string | null
  validUntil: string | null
}

/** Erstellt bis zu 500 Codes auf einmal (du sprichst). */
export function dashCodeBulkCreate(
  input: DashCodeBulkCreateInput,
  store: DashStore = dashStoreGet(),
): Result<DashCode[]> {
  const op = "dashCodeBulkCreate"
  const event = store.state.events.find((candidate) => candidate.id === input.eventId)
  if (!event) return createResultError(op, "Event nicht gefunden.")
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 500)
    return createResultError(op, "Die Anzahl muss zwischen 1 und 500 liegen.")
  if (input.kind === "rabatt") {
    if (!input.discount || input.discount.value <= 0)
      return createResultError(op, "Bitte wähle einen Rabattwert größer als 0.")
    if (input.discount.type === "prozent" && input.discount.value > 10000)
      return createResultError(op, "Der Prozentrabatt darf höchstens 100 % betragen.")
  } else {
    const eventTypes = store.state.ticketTypes.filter((type) => type.eventId === input.eventId)
    const hiddenIds = new Set(eventTypes.filter((type) => type.hidden).map((type) => type.id))
    if (input.ticketTypeIds.length === 0 || !input.ticketTypeIds.every((id) => hiddenIds.has(id)))
      return createResultError(op, "Bitte wähle mindestens eine versteckte Ticketart für den Zugang.")
  }
  if (input.validFrom && input.validUntil && Date.parse(input.validUntil) <= Date.parse(input.validFrom))
    return createResultError(op, "„Gültig bis“ muss nach „Gültig von“ liegen.")
  const existing = store.state.codes.filter((code) => code.eventId === input.eventId).map((code) => code.code)
  const generated = dashCodeGenerate({
    prefix: input.prefix,
    count: input.count,
    existing,
    random: dashRandomCreate(Date.now()),
  })
  if (generated.length !== input.count)
    return createResultError(op, "Es konnten nicht genug eindeutige Codes erzeugt werden.")
  const nowIso = new Date().toISOString()
  const created: DashCode[] = generated.map((code) => ({
    id: dashIdCreate("code"),
    eventId: input.eventId,
    kind: input.kind,
    code,
    ticketTypeIds: [...input.ticketTypeIds],
    maxTickets: input.maxTickets,
    usedTickets: 0,
    validFrom: input.validFrom,
    validUntil: input.validUntil,
    active: true,
    note: "",
    createdAt: nowIso,
    discount: input.discount ? { type: input.discount.type, value: input.discount.value } : null,
  }))
  const stored = store.update(op, (draft) => {
    draft.codes.push(...created)
    dashAuditAdd(draft, {
      orgId: event.orgId,
      eventId: event.id,
      area: "codes",
      action: `Code ${created[0]?.code ?? ""} erstellt`,
      before: null,
      after: `${created.length} Codes (${input.prefix || "ohne Präfix"})`,
    })
  })
  if (!stored.success) return createResultError(op, "Die Codes konnten nicht gespeichert werden.")
  return createResult(created)
}
