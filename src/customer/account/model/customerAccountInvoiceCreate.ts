export type CustomerAccountInvoiceLine = {
  readonly name: string
  readonly quantity: number
  readonly unitPriceCents: number
}

export type CustomerAccountInvoice = {
  readonly invoiceNumber: string
  readonly issuedAt: string | null
  readonly buyerName: string
  readonly buyerEmail: string
  readonly eventTitle: string
  readonly lines: CustomerAccountInvoiceLine[]
  readonly subtotalCents: number
  readonly feeCents: number
  readonly totalCents: number
}

/**
 * Read-only invoice projection from canonical paid-order snapshots. Only paid
 * orders yield an invoice; nothing is generated or backfilled. Instants stay
 * UTC, Berlin formatting happens in the UI.
 */
export function customerAccountInvoiceCreate(inputs: {
  readonly bookingReference?: string
  readonly bookingNumber?: number
  readonly paidAt?: string
  readonly checkoutCompletedAt?: string
  readonly buyerName: string
  readonly buyerEmail: string
  readonly eventTitle: string
  readonly lines: readonly CustomerAccountInvoiceLine[]
  readonly subtotalCents: number
  readonly feeCents: number
  readonly totalCents: number
}): CustomerAccountInvoice | null {
  const issuedAt = inputs.paidAt ?? inputs.checkoutCompletedAt ?? null
  if (issuedAt === null) return null
  return {
    invoiceNumber:
      inputs.bookingReference ?? (inputs.bookingNumber !== undefined ? `EV-${inputs.bookingNumber}` : "k.A."),
    issuedAt,
    buyerName: inputs.buyerName,
    buyerEmail: inputs.buyerEmail,
    eventTitle: inputs.eventTitle,
    lines: [...inputs.lines],
    subtotalCents: inputs.subtotalCents,
    feeCents: inputs.feeCents,
    totalCents: inputs.totalCents,
  }
}
