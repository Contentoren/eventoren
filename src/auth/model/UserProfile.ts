import { v } from "convex/values"
import * as a from "valibot"
import { type UserRole, userRoleSchema } from "#src/auth/model_field/userRole.ts"
import { userRoleValidator } from "#src/auth/model_field/userRoleValidator.ts"
import { type OrgRole, orgRoleSchema } from "#src/org/org_model_field/orgRole.ts"
import { orgRoleValidator } from "#src/org/org_model_field/orgRoleValidator.ts"
import { fieldsConvexCreatedAtUpdatedAtDeletedAt } from "#src/utils/data/fieldsConvexCreatedAtUpdatedAtDeletedAt.ts"
import { fieldsSchemaCreatedAtUpdatedAtDeletedAt } from "#src/utils/data/fieldsSchemaCreatedAtUpdatedAtDeletedAt.ts"
import type { HasCreatedAtUpdatedDeletedAt } from "#src/utils/data/HasCreatedAtUpdatedDeletedAt.ts"
import { emailSchema } from "#src/utils/valibot/emailSchema.ts"
import { handleSchema } from "#src/utils/valibot/handleSchema.ts"
import { stringSchema0to500, stringSchemaId, stringSchemaName } from "#src/utils/valibot/stringSchema.ts"
import { dateTimeSchema } from "#utils/valibot/dateTimeSchema.js"

export interface UserProfile extends HasCreatedAtUpdatedDeletedAt {
  userId: string
  name: string
  username?: string
  image?: string
  bio?: string
  url?: string
  email?: string
  emailVerifiedAt?: string
  role: UserRole
  orgHandle?: string
  orgRole?: OrgRole
}

export const userProfileSchema = a.object({
  userId: stringSchemaId,
  name: stringSchemaName,
  username: a.optional(handleSchema),
  image: a.optional(stringSchema0to500),
  bio: a.optional(a.string()),
  url: a.optional(a.string()),
  email: a.optional(emailSchema),
  emailVerifiedAt: a.optional(dateTimeSchema),
  role: userRoleSchema,
  orgHandle: a.optional(a.string()),
  orgRole: a.optional(orgRoleSchema),
  ...fieldsSchemaCreatedAtUpdatedAtDeletedAt,
})

function types1(a: a.InferOutput<typeof userProfileSchema>): UserProfile {
  return a
}

export const userProfileValidator = v.object({
  userId: v.string(),
  name: v.string(),
  image: v.optional(v.string()),
  bio: v.optional(v.string()),
  url: v.optional(v.string()),
  email: v.optional(v.string()),
  emailVerifiedAt: v.optional(v.string()),
  role: userRoleValidator,
  orgHandle: v.optional(v.string()),
  orgRole: v.optional(orgRoleValidator),
  ...fieldsConvexCreatedAtUpdatedAtDeletedAt,
})
