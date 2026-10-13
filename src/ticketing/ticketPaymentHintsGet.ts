import type { EventItem } from "../events/EventItem.ts"

export function ticketPaymentHintsGet(events: readonly Pick<EventItem, "allowedStripePaymentMethods">[]) {
  const choices = [
    { method: "card", label: "Kredit-/Debitkarten (Apple Pay / Google Pay, sofern verfügbar)" },
    { method: "klarna", label: "Klarna" },
    { method: "sepa_debit", label: "SEPA-Lastschrift" },
    { method: "bancontact", label: "Bancontact" },
  ] as const
  if (!events.length) return []
  return choices
    .filter(({ method }) =>
      events.every((event) => {
        const policy = event.allowedStripePaymentMethods
        return !policy?.length || policy.some((allowed) => allowed === method)
      }),
    )
    .map(({ label }) => label)
}
