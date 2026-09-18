import type { TicketCheckoutStep } from "./TicketCheckoutStep.ts"

export function ticketCheckoutStepLabels(): Record<TicketCheckoutStep, string> {
  return {
    kontakt: "Kontakt & Zahlung",
    bestaetigung: "Bestätigung",
  }
}
