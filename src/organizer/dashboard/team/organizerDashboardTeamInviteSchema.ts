import * as v from "valibot"
import { organizerDashboardRoleSchema } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"
import { emailSchema } from "#src/utils/valibot/emailSchema.ts"

/** Bounded invite batch: at most five addresses, one five-role team role. */
export const organizerDashboardTeamInviteSchema = v.object({
  emails: v.pipe(v.array(emailSchema), v.minLength(1), v.maxLength(5)),
  organizerRole: organizerDashboardRoleSchema,
})

export type OrganizerDashboardTeamInvite = v.InferOutput<typeof organizerDashboardTeamInviteSchema>
