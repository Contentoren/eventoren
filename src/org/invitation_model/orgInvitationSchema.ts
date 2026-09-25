import * as a from "valibot"
import { languageSchema } from "#src/app/i18n/language.ts"
import type { DocOrgInvitation } from "#src/org/invitation_convex/IdOrgInvitation.ts"
import type { OrgInvitationModel } from "#src/org/invitation_model/OrgInvitationModel.ts"
import { orgRoleSchema } from "#src/org/org_model_field/orgRole.ts"
import { fieldsSchemaCreatedAtUpdatedAt } from "#src/utils/data/fieldsSchemaCreatedAtUpdatedAt.ts"
import { emailSchema } from "#src/utils/valibot/emailSchema.ts"
import { handleSchema } from "#src/utils/valibot/handleSchema.ts"
import { stringSchema0to100 } from "#src/utils/valibot/stringSchema0to100.ts"
import { stringSchemaId } from "#src/utils/valibot/stringSchemaId.ts"
import { dateTimeSchema } from "#utils/valibot/dateTimeSchema.js"

export const orgInvitationDataSchemaFields = {
  // ids
  orgHandle: handleSchema,
  invitationCode: stringSchemaId,
  // invited
  invitedName: stringSchema0to100,
  invitedEmail: emailSchema,
  l: languageSchema,
  // data
  role: orgRoleSchema,
  invitedBy: stringSchemaId,
  // invitedByName: stringSchema1to50,
  // invitedByEmail: emailSchema,
  // server processing
  emailSendAt: a.optional(dateTimeSchema),
  emailSendAmount: a.number(),
} as const

export const orgInvitationDataSchema = a.object(orgInvitationDataSchemaFields)

export const orgInvitationSchema = a.object({
  ...orgInvitationDataSchemaFields,
  ...fieldsSchemaCreatedAtUpdatedAt,
})

function types1(o: DocOrgInvitation): OrgInvitationModel {
  return o
}
