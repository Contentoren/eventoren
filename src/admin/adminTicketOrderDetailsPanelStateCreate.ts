import type { AdminTicketOrderDetails } from "./AdminTicketOrderDetails.ts"

export function adminTicketOrderDetailsPanelStateCreate(inputs: { readonly order: () => AdminTicketOrderDetails }) {
  const stripe = () => inputs.order().stripeDetails
  const charge = () => stripe()?.charge
  const session = () => stripe()?.session
  const stripeContact = () => session()?.customerDetails ?? null
  const billingContact = () => charge()?.billingDetails ?? null
  const address = () => billingContact()?.address ?? stripeContact()?.address ?? null

  return {
    address,
    billingContact,
    charge,
    session,
    stripe,
    stripeContact,
    cardLabel() {
      const card = charge()?.paymentMethod?.card
      if (!card) return "Keine Kartendaten verfügbar"
      const label = [card.brand, card.last4 ? `···· ${card.last4}` : null].filter(Boolean).join(" ") || "Karte"
      if (card.expMonth === null || card.expYear === null) return label
      return `${label} — gültig bis ${String(card.expMonth).padStart(2, "0")}/${card.expYear}`
    },
    amountFormat(cents: number, currency: string) {
      try {
        return new Intl.NumberFormat("de-DE", { style: "currency", currency: currency.toUpperCase() }).format(
          cents / 100,
        )
      } catch {
        return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
      }
    },
    localStatusLabel(status: string) {
      return (
        (
          {
            reserved: "Reserviert",
            checkout_created: "Checkout erstellt",
            paid: "Bezahlt",
            failed: "Fehlgeschlagen",
            expired: "Abgelaufen",
            released: "Freigegeben",
            paid_inventory_conflict: "Bezahlt – Platzkonflikt",
            pending: "Offen",
          } as Record<string, string>
        )[status] ?? status
      )
    },
    stripeStatusLabel(status: string | undefined) {
      if (!status) return "Nicht verfügbar"
      return (
        (
          {
            succeeded: "Erfolgreich",
            processing: "In Bearbeitung",
            unpaid: "Nicht bezahlt",
            paid: "Bezahlt",
            canceled: "Storniert",
          } as Record<string, string>
        )[status] ?? status
      )
    },
  }
}
