export type TicketCheckoutCreateInput = {
  readonly token?: string
  readonly guestAccessToken?: string
  readonly checkoutKey: string
  readonly eventKey: string
  readonly catalogVersion: number
  readonly tickets: { readonly tierKey: string; readonly quantity: number }[]
  readonly successUrl: string
  readonly cancelUrl: string
  readonly locale: "de" | "en"
  readonly customer: {
    readonly email: string
    readonly givenName: string
    readonly familyName: string
    readonly phone: string
  }
  readonly legalContext: {
    readonly cta: string
    readonly termsAccepted: true
    readonly privacyAcknowledged: true
    readonly documentSetRevision: string
  }
}
