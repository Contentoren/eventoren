const adminTicketOrderPaymentMethodLabels: Record<string, string> = {
  card: "Karte",
  sepa_debit: "SEPA",
  paypal: "PayPal",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  link: "Link",
  klarna: "Klarna",
  ideal: "iDEAL",
  bancontact: "Bancontact",
  giropay: "GiroPay",
  eps: "EPS",
  p24: "P24",
}

export function adminTicketOrderPaymentMethodLabel(paymentMethodType?: string | null): string {
  if (!paymentMethodType) return "—"
  return adminTicketOrderPaymentMethodLabels[paymentMethodType] ?? paymentMethodType
}
