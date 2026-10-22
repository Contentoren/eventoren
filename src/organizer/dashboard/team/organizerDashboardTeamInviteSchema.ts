import * as v from "valibot"
import { organizerDashboardRoleSchema } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"
import { emailSchema } from "#src/utils/valibot/emailSchema.ts"

/** Bounded invite batch: at most five addresses, one five-role team role. */
export const organizerDashboardTeamInviteSchema = v.object({
  emails: v.pipe(
    v.array(emailSchema),
    v.minLength(1, "Bitte gib mindestens eine E-Mail-Adresse an."),
    v.maxLength(5, "Bitte lade höchstens fünf Adressen auf einmal ein."),
  ),
  organizerRole: organizerDashboardRoleSchema,
})

export type OrganizerDashboardTeamInvite = v.InferOutput<typeof organizerDashboardTeamInviteSchema>
