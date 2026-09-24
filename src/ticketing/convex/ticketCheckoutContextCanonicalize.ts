export function ticketCheckoutContextCanonicalize(input: {
  checkoutKey: string
  eventKey: string
  catalogVersion: number
  eventRevision?: number
  tickets: readonly {
    tierKey: string
    quantity: number
    participantNames?: readonly string[]
  }[]
  stripeMode: "live" | "test"
  successUrl: string
  cancelUrl: string
  locale: "de" | "en"
  customer: {
    email: string
    givenName: string
    familyName: string
    address: string
    phone: string
  }
  legalContext: {
    cta: string
    termsAccepted: true
    privacyAcknowledged: true
    documentSetRevision: string
    termsMarkdown?: string
    privacyMarkdown?: string
  }
}): string {
  return JSON.stringify({
    ...input,
    ...(input.eventRevision !== undefined ? { eventRevision: input.eventRevision } : {}),
    legalContext: {
      cta: input.legalContext.cta,
      documentSetRevision: input.legalContext.documentSetRevision,
      privacyAcknowledged: input.legalContext.privacyAcknowledged,
      ...(input.legalContext.privacyMarkdown !== undefined
        ? { privacyMarkdown: input.legalContext.privacyMarkdown }
        : {}),
      termsAccepted: input.legalContext.termsAccepted,
      ...(input.legalContext.termsMarkdown !== undefined ? { termsMarkdown: input.legalContext.termsMarkdown } : {}),
    },
    tickets: [...input.tickets]
      .sort((left, right) => left.tierKey.localeCompare(right.tierKey))
      .map((ticket) => ({
        tierKey: ticket.tierKey,
        quantity: ticket.quantity,
        ...(ticket.participantNames !== undefined ? { participantNames: [...ticket.participantNames] } : {}),
      })),
  })
}
