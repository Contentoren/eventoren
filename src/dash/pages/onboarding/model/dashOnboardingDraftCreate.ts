import type { DashOrgKind } from "../../../model/dashOrgKindSchema.ts"
import type { DashTaxStatus } from "../../../model/dashTaxStatusSchema.ts"

export type DashOnboardingDraft = {
  accountName: string
  accountEmail: string
  accountPassword: string
  kind: DashOrgKind
  orgName: string
  slug: string
  slugTouched: boolean
  logoDataUrl: string | null
  legalName: string
  street: string
  zip: string
  city: string
  representative: string
  register: string
  vatId: string
  taxStatus: DashTaxStatus
  holder: string
  iban: string
  termsAccepted: boolean
  dpaAccepted: boolean
}

/** Erzeugt einen leeren Onboarding-Entwurf (Session-Name wird ggf. vorbelegt). */
export function dashOnboardingDraftCreate(sessionName: string): DashOnboardingDraft {
  return {
    accountName: sessionName,
    accountEmail: "",
    accountPassword: "",
    kind: "verein",
    orgName: "",
    slug: "",
    slugTouched: false,
    logoDataUrl: null,
    legalName: "",
    street: "",
    zip: "",
    city: "",
    representative: "",
    register: "",
    vatId: "",
    taxStatus: "regel",
    holder: "",
    iban: "",
    termsAccepted: false,
    dpaAccepted: false,
  }
}
