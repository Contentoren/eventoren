export const organizerContractPartyConsentFixture = {
  contractParty: {
    legalName: "Testverein e.V.",
    representativeName: "Erika Musterfrau",
    streetAddress: "Teststraße 1",
    postalCode: "10115",
    city: "Berlin",
    countryCode: "DE",
    email: "vertrag@example.org",
    customerType: "business" as const,
  },
  authorityConfirmed: true as const,
  earlyServiceStartRequested: false,
  feePayer: "kaeufer" as const,
}
