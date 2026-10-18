import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { DashOrder } from "../../../../model/dashOrderSchema.ts"

/** Zustand für den Käuferdaten-Dialog: Vorname/Nachname/E-Mail mit Validierungsfehler. */
export function dashOrderBuyerDialogStateCreate(inputs: { order: () => DashOrder }) {
  const firstName = createSignalObject("")
  const lastName = createSignalObject("")
  const email = createSignalObject("")
  const error = createSignalObject<string | null>(null)
  const pending = createSignalObject(false)

  const openReset = (open: boolean) => {
    if (!open) return
    const buyer = inputs.order().buyer
    firstName.set(buyer.firstName)
    lastName.set(buyer.lastName)
    email.set(buyer.email)
    error.set(null)
    pending.set(false)
  }

  return { firstName, lastName, email, error, pending, openReset }
}

export type DashOrderBuyerDialogState = ReturnType<typeof dashOrderBuyerDialogStateCreate>
