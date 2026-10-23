import * as v from "valibot"
import { createResult, createResultError, type Result } from "#result"
import { organizerDashboardOrganizationCreateSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationCreateSchema.ts"
import type { VeranstalterOnboardingDraft } from "./veranstalterOnboardingDraftSchema.ts"

type CreateOutput = v.InferOutput<typeof organizerDashboardOrganizationCreateSchema>

/** Validated technical onboarding fields; consent booleans are never part of this data. */
export type VeranstalterOnboardingTechnicalData = Omit<
  CreateOutput,
  | "termsAccepted"
  | "dpaAccepted"
  | "termsRevision"
  | "dpaRevision"
  | "authorityConfirmed"
  | "earlyServiceStartRequested"
>

export type VeranstalterOnboardingRawInput = Omit<VeranstalterOnboardingDraft, "kind"> & { readonly kind: string }

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

/**
 * Pure technical-field validation reusing the shared create schema.
 * Consent fields are omitted entirely; technical validation cannot invent acceptance.
 */
export function veranstalterOnboardingInputValidate(
  raw: VeranstalterOnboardingRawInput,
): Result<VeranstalterOnboardingTechnicalData> {
  const op = "veranstalterOnboardingInputValidate"
  const contactEmail = emptyToUndefined(raw.contactEmail)
  const contactPhone = emptyToUndefined(raw.contactPhone)
  const imprint = emptyToUndefined(raw.imprint)
  const iban = emptyToUndefined(raw.iban)?.replace(/[\s-]+/g, "")
  const bankHolder = emptyToUndefined(raw.bankHolder)
  if ((iban !== undefined) !== (bankHolder !== undefined)) {
    return createResultError(op, "Bitte IBAN und Kontoinhaber gemeinsam angeben.")
  }
  const parsed = v.safeParse(
    v.omit(organizerDashboardOrganizationCreateSchema, [
      "termsAccepted",
      "dpaAccepted",
      "termsRevision",
      "dpaRevision",
      "authorityConfirmed",
      "earlyServiceStartRequested",
    ]),
    {
      name: raw.name.trim(),
      slug: raw.slug.trim(),
      kind: raw.kind.trim(),
      contractParty: { ...raw.contractParty, countryCode: raw.contractParty.countryCode.trim().toUpperCase() },
      feePayer: raw.feePayer,
      ...(contactEmail !== undefined || contactPhone !== undefined
        ? {
            contact: {
              ...(contactEmail !== undefined ? { email: contactEmail } : {}),
              ...(contactPhone !== undefined ? { phone: contactPhone } : {}),
            },
          }
        : {}),
      ...(imprint !== undefined ? { imprint } : {}),
      ...(iban !== undefined || bankHolder !== undefined
        ? {
            bank: {
              ...(iban !== undefined ? { iban } : {}),
              ...(bankHolder !== undefined ? { holder: bankHolder } : {}),
            },
          }
        : {}),
    },
  )
  if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
  return createResult(parsed.output)
}
