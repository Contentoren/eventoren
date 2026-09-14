import { v } from "convex/values"
import { userProfileValidator } from "#src/auth/model/UserProfile.ts"
import { loginMethodValidator } from "#src/auth/model_field/loginMethodValidator.ts"

export const userSessionValidator = v.object({
  token: v.string(),
  profile: userProfileValidator,
  hasPw: v.boolean(),
  signedInMethod: loginMethodValidator,
  signedInAt: v.string(),
  expiresAt: v.string(),
})
