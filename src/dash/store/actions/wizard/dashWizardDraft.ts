import * as v from "valibot"

import { dashEventCategorySchema } from "../../../model/dashEventCategorySchema.ts"
import { dashEventVisibilitySchema } from "../../../model/dashEventVisibilitySchema.ts"
import { dashTaxRateSchema } from "../../../model/dashTaxRateSchema.ts"
import type { DashWizardDraft } from "./dashTemplateToWizard.ts"

const dashWizardPhaseDraftSchema = v.object({
  name: v.string(),
  priceCents: v.number(),
  endsAt: v.nullable(v.string()),
  quota: v.nullable(v.number()),
})

const dashWizardTicketDraftSchema = v.object({
  name: v.string(),
  priceCents: v.number(),
  capacity: v.number(),
  taxRateBps: dashTaxRateSchema,
  hidden: v.boolean(),
  phasesExpanded: v.boolean(),
  phases: v.array(dashWizardPhaseDraftSchema),
})

export const dashWizardDraftSchema = v.object({
  title: v.string(),
  subtitle: v.string(),
  category: dashEventCategorySchema,
  startsAt: v.nullable(v.string()),
  endsAt: v.nullable(v.string()),
  doorsAt: v.nullable(v.string()),
  venueName: v.string(),
  venueStreet: v.string(),
  venueZip: v.string(),
  venueCity: v.string(),
  imageUrl: v.string(),
  imageAlt: v.string(),
  imageAltTouched: v.boolean(),
  description: v.string(),
  visibility: dashEventVisibilitySchema,
  tickets: v.array(dashWizardTicketDraftSchema),
})

/** Erzeugt einen leeren Wizard-Entwurf mit Standard-Ticket. */
export function dashWizardDraftCreate(defaultRateBps: 1900 | 700): DashWizardDraft {
  return {
    title: "",
    subtitle: "",
    category: "konzert",
    startsAt: null,
    endsAt: null,
    doorsAt: null,
    venueName: "",
    venueStreet: "",
    venueZip: "",
    venueCity: "",
    imageUrl: "",
    imageAlt: "",
    imageAltTouched: false,
    description: "",
    visibility: "oeffentlich",
    tickets: [
      {
        name: "Standard",
        priceCents: 2500,
        capacity: 100,
        taxRateBps: defaultRateBps,
        hidden: false,
        phasesExpanded: false,
        phases: [{ name: "Regulär", priceCents: 2500, endsAt: null, quota: null }],
      },
    ],
  }
}
