export function ticketCheckoutContextCanonicalize(input: {
  checkoutKey: string
  eventKey: string
  catalogVersion: number
  tickets: readonly { tierKey: string; quantity: number }[]
  stripeMode: "live" | "test"
  successUrl: string
  cancelUrl: string
  locale: "de" | "en"
  customer: {
    email: string
    givenName: string
    familyName: string
    phone: string
  }
  legalContext: {
    cta: string
    termsAccepted: true
    privacyAcknowledged: true
    documentSetRevision: string
  }
}): string {
  return JSON.stringify({
    ...input,
    tickets: [...input.tickets].sort((left, right) => left.tierKey.localeCompare(right.tierKey)),
  })
}
