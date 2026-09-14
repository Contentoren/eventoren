import { v } from "convex/values"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { createTokenValidator } from "#src/utils/convex_backend/createTokenValidator.ts"

export const userDeleteFields = {
  email: v.optional(v.string()),
} as const

export const userDeleteValidatorInternal = v.object({
  ...userDeleteFields,
  userId: vIdUser,
})

export type UserDeleteValidatorInternalType = typeof userDeleteValidatorInternal.type

export const userDeleteFieldsPublic = {
  email: v.optional(v.string()),
} as const

export const userDeleteValidatorPublic = createTokenValidator(userDeleteFieldsPublic)

export type UserDeleteValidatorPublicType = typeof userDeleteValidatorPublic.type
