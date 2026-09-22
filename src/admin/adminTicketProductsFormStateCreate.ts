import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { EventTicketTier } from "../events/EventTicketTier.ts"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"
import { adminEuroFromCents } from "./adminEuroFromCents.ts"
import { adminEuroToCents } from "./adminEuroToCents.ts"

export function adminTicketProductsFormStateCreate(catalog: AdminCatalogPageState) {
  const priceEuro = createSignalObject("")
  const feeEuro = createSignalObject("")
  const validationMessage = createSignalObject("")

  const selectTier = (tier: EventTicketTier) => {
    catalog.selectTier(tier)
    priceEuro.set(adminEuroFromCents(tier.priceCents))
    feeEuro.set(adminEuroFromCents(tier.feeCents))
    validationMessage.set("")
  }

  const newTier = () => {
    const existingTierKeys = new Set(catalog.selectedEvent()?.tiers.map((tier) => tier.id) ?? [])
    let tierNumber = existingTierKeys.size + 1
    while (existingTierKeys.has(`ticket-${tierNumber}`)) tierNumber += 1

    catalog.tierFieldChange("tierKey", `ticket-${tierNumber}`)
    catalog.tierFieldChange("name", "")
    catalog.tierFieldChange("description", "")
    catalog.tierFieldChange("priceCents", "")
    catalog.tierFieldChange("feeCents", "")
    catalog.tierFieldChange("capacity", "")
    catalog.tierFieldChange("sortOrder", "0")
    priceEuro.set("")
    feeEuro.set("")
    validationMessage.set("")
  }

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    const priceCents = adminEuroToCents(priceEuro.get())
    const feeCents = adminEuroToCents(feeEuro.get())
    if (priceCents === null || feeCents === null) {
      validationMessage.set("Preis und Gebühr brauchen einen Eurobetrag mit höchstens zwei Nachkommastellen.")
      return
    }

    validationMessage.set("")
    catalog.tierFieldChange("priceCents", String(priceCents))
    catalog.tierFieldChange("feeCents", String(feeCents))
    await catalog.saveTier()
    if (!catalog.errorMessage()) newTier()
  }

  return {
    priceEuro,
    feeEuro,
    validationMessage: validationMessage.get,
    selectTier,
    newTier,
    submit,
  }
}
