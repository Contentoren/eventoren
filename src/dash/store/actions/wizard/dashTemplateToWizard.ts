import type { DashTemplate } from "../../../model/dashTemplateSchema.ts"
import type { DashEventCategory } from "../../../model/dashEventCategorySchema.ts"

export type DashWizardTicketPhaseDraft = {
  name: string
  priceCents: number
  endsAt: string | null
  quota: number | null
}

export type DashWizardTicketDraft = {
  name: string
  priceCents: number
  capacity: number
  taxRateBps: 1900 | 700
  hidden: boolean
  phasesExpanded: boolean
  phases: DashWizardTicketPhaseDraft[]
}

export type DashWizardDraft = {
  title: string
  subtitle: string
  category: DashEventCategory
  startsAt: string | null
  endsAt: string | null
  doorsAt: string | null
  venueName: string
  venueStreet: string
  venueZip: string
  venueCity: string
  imageUrl: string
  imageAlt: string
  imageAltTouched: boolean
  description: string
  visibility: "oeffentlich" | "nicht-gelistet"
  tickets: DashWizardTicketDraft[]
}

function dashTemplateOffsetApply(baseIso: string, offsetMinutes: number | null): string | null {
  if (offsetMinutes === null || offsetMinutes === undefined) return null
  const base = Date.parse(baseIso)
  if (!Number.isFinite(base)) return null
  return new Date(base + offsetMinutes * 60_000).toISOString()
}

/** Baut aus einer Vorlage einen Wizard-Entwurf; Offsets werden relativ zum Beginn aufgelöst. */
export function dashTemplateToWizard(template: DashTemplate, startsAt: string): DashWizardDraft {
  return {
    title: template.event.title,
    subtitle: template.event.subtitle,
    category: template.event.category,
    startsAt,
    endsAt:
      template.durationMinutes === null || template.durationMinutes === undefined
        ? null
        : new Date(Date.parse(startsAt) + template.durationMinutes * 60_000).toISOString(),
    doorsAt:
      template.doorsBeforeMinutes === null || template.doorsBeforeMinutes === undefined
        ? null
        : new Date(Date.parse(startsAt) - template.doorsBeforeMinutes * 60_000).toISOString(),
    venueName: template.event.venue.name,
    venueStreet: template.event.venue.street,
    venueZip: template.event.venue.zip,
    venueCity: template.event.venue.city,
    imageUrl: template.event.imageUrl,
    imageAlt: template.event.imageAlt,
    imageAltTouched: template.event.imageAlt.trim().length > 0,
    description: template.event.description,
    visibility: "oeffentlich",
    tickets: template.ticketTypes.map((type) => ({
      name: type.name,
      priceCents: type.phases[0]?.priceCents ?? 0,
      capacity: type.capacity,
      taxRateBps: type.taxRateBps,
      hidden: type.hidden,
      phasesExpanded: type.phases.length > 1,
      phases: type.phases.map((phase) => ({
        name: phase.name,
        priceCents: phase.priceCents,
        endsAt: dashTemplateOffsetApply(startsAt, phase.endsOffsetMinutes),
        quota: phase.quota,
      })),
    })),
  }
}
