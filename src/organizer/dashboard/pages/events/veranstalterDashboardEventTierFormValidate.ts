import * as v from "valibot"
import { createResult, createResultError, type Result } from "#result"
import type { OrganizerDashboardTierUpsert } from "#src/organizer/dashboard/events/model/organizerDashboardTierUpsertSchema.ts"
import { organizerDashboardTierUpsertSchema } from "#src/organizer/dashboard/events/model/organizerDashboardTierUpsertSchema.ts"

export type VeranstalterDashboardEventTierForm = {
  readonly name: string
  readonly description: string
  readonly priceEuros: string
  readonly capacity: string
  readonly maxPerOrder: string
}

export const veranstalterDashboardEventTierFormEmpty: VeranstalterDashboardEventTierForm = {
  name: "",
  description: "",
  priceEuros: "",
  capacity: "",
  maxPerOrder: "",
}

function veranstalterDashboardTierPriceParse(value: string): Result<number> {
  const op = "veranstalterDashboardEventTierFormValidate"
  const normalized = value.trim().replace(",", ".")
  if (normalized.length === 0) return createResultError(op, "Bitte gib einen Preis ein.")
  if (!/^\d+(\.\d{1,2})?$/u.test(normalized)) {
    return createResultError(op, "Der Preis muss ein Euro-Betrag mit höchstens zwei Nachkommastellen sein.")
  }
  const cents = Math.round(Number.parseFloat(normalized) * 100)
  if (!Number.isSafeInteger(cents) || cents < 0) return createResultError(op, "Der Preis darf nicht negativ sein.")
  return createResult(cents)
}

function veranstalterDashboardTierCountParse(label: string, value: string, minimum: number): Result<number> {
  const op = "veranstalterDashboardEventTierFormValidate"
  if (value.trim().length === 0) return createResultError(op, `Bitte gib ${label} ein.`)
  const parsed = Number(value.trim())
  if (!Number.isInteger(parsed) || parsed < minimum) {
    return createResultError(op, `${label} muss eine ganze Zahl ab ${minimum} sein.`)
  }
  return createResult(parsed)
}

/**
 * Validates tier form input. The fee stays server-computed: callers never
 * provide feeCents, only priceCents plus inventory counts.
 */
export function veranstalterDashboardEventTierFormValidate(
  form: VeranstalterDashboardEventTierForm,
): Result<OrganizerDashboardTierUpsert> {
  const op = "veranstalterDashboardEventTierFormValidate"
  if (form.name.trim().length === 0) return createResultError(op, "Bitte gib einen Tarifnamen ein.")
  const price = veranstalterDashboardTierPriceParse(form.priceEuros)
  if (!price.success) return price
  const capacity = veranstalterDashboardTierCountParse("die Kapazität", form.capacity, 0)
  if (!capacity.success) return capacity

  let maxPerOrder: number | undefined
  if (form.maxPerOrder.trim().length > 0) {
    const parsed = veranstalterDashboardTierCountParse("Maximalmenge pro Bestellung", form.maxPerOrder, 1)
    if (!parsed.success) return parsed
    maxPerOrder = parsed.data
  }

  const parsed = v.safeParse(organizerDashboardTierUpsertSchema, {
    name: form.name.trim(),
    description: form.description,
    priceCents: price.data,
    capacity: capacity.data,
    ...(maxPerOrder === undefined ? {} : { maxPerOrder }),
  })
  if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
  return createResult(parsed.output)
}
