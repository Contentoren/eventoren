import * as v from "valibot"
import { createResult, createResultError, type Result } from "#result"
import { organizerDashboardOrganizationUpdateSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationUpdateSchema.ts"

type UpdateOutput = v.InferOutput<typeof organizerDashboardOrganizationUpdateSchema>

export type VeranstalterEinstellungenRawInput = {
  readonly orgId: string
  readonly name: string
  readonly kind: string
  readonly contactEmail: string
  readonly contactPhone: string
  readonly imprint: string
  readonly iban: string
  readonly bankHolder: string
  readonly includeBank: boolean
}

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

/**
 * Pure settings validation reusing the shared update schema.
 * Bank is only included when the caller confirms edit permission
 * (includeBank); otherwise profile-only updates are validated.
 */
export function veranstalterEinstellungenInputValidate(raw: VeranstalterEinstellungenRawInput): Result<UpdateOutput> {
  const op = "veranstalterEinstellungenInputValidate"
  const contactEmail = emptyToUndefined(raw.contactEmail)
  const contactPhone = emptyToUndefined(raw.contactPhone)
  const imprint = emptyToUndefined(raw.imprint)
  const iban = emptyToUndefined(raw.iban)?.replace(/[\s-]+/g, "")
  const bankHolder = emptyToUndefined(raw.bankHolder)
  if ((iban !== undefined) !== (bankHolder !== undefined)) {
    return createResultError(op, "Bitte IBAN und Kontoinhaber gemeinsam angeben.")
  }
  const parsed = v.safeParse(organizerDashboardOrganizationUpdateSchema, {
    orgId: raw.orgId,
    profile: {
      name: raw.name.trim(),
      kind: raw.kind.trim(),
      ...(contactEmail !== undefined || contactPhone !== undefined
        ? {
            contact: {
              ...(contactEmail !== undefined ? { email: contactEmail } : {}),
              ...(contactPhone !== undefined ? { phone: contactPhone } : {}),
            },
          }
        : {}),
      ...(imprint !== undefined ? { imprint } : {}),
    },
    ...(raw.includeBank && (iban !== undefined || bankHolder !== undefined)
      ? {
          bank: {
            ...(iban !== undefined ? { iban } : {}),
            ...(bankHolder !== undefined ? { holder: bankHolder } : {}),
          },
        }
      : {}),
  })
  if (!parsed.success) return createResultError(op, parsed.issues[0]?.message ?? "Bitte prüfe deine Eingaben.")
  return createResult(parsed.output)
}
