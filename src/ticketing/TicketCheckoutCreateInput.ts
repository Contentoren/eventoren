export type TicketCheckoutCreateInput = {
  readonly token?: string
  readonly guestAccessToken?: string
  readonly checkoutKey: string
  readonly eventKey: string
  readonly catalogVersion: number
  readonly eventRevision: number
  readonly tickets: {
    readonly tierKey: string
    readonly quantity: number
    readonly activationCode?: string
    readonly participantNames: string[]
  }[]
  readonly successUrl: string
  readonly cancelUrl: string
  readonly locale: "de" | "en"
  readonly customer: {
    readonly email: string
    readonly givenName: string
    readonly familyName: string
    readonly address: string
    readonly phone: string
    readonly billingDetails: {
      readonly givenName: string
      readonly familyName: string
      readonly company?: string
      readonly companyExtra?: string
      readonly address: {
        readonly line1: string
        readonly line2?: string
        readonly postalCode: string
        readonly city: string
        readonly country: string
      }
      readonly taxId?: { readonly type: "eu_vat"; readonly value: string }
    }
  }
  readonly legalContext: {
    readonly cta: string
    readonly termsAccepted: true
    readonly privacyAcknowledged: true
    readonly documentSetRevision: string
    readonly termsMarkdown?: string
    readonly privacyMarkdown?: string
  }
}
