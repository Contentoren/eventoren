import type * as a from "valibot"
import type { orgInvitationDataSchema, orgInvitationSchema } from "#src/org/invitation_model/orgInvitationSchema.ts"

export type OrgInvitationDataModel = a.InferOutput<typeof orgInvitationDataSchema>

export type OrgInvitationModel = a.InferOutput<typeof orgInvitationSchema>
