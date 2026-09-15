import type { TicketCheckoutStep } from "./TicketCheckoutStep.ts"
import { language } from "../app/i18n/language.ts"
import { languageSignal } from "../app/i18n/languageSignal.ts"

export function ticketCheckoutStepLabels(): Record<TicketCheckoutStep, string> {
  if (languageSignal.get() === language.de) {
    return {
      kontakt: "Kontakt & Zahlung",
      bestaetigung: "Bestätigung",
    }
  }

  return {
    kontakt: "Contact & payment",
    bestaetigung: "Confirmation",
  }
}
