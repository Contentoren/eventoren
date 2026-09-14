import { type Infer, v } from "convex/values"
import { loginProviderValidator } from "#src/auth/model_field/loginMethodValidator.ts"

export type CommonAuthProvider = Infer<typeof commonAuthProviderValidator>

export const commonAuthProviderValidator = v.object({
  // provider
  provider: loginProviderValidator,
  providerId: v.string(),
  // data
  givenName: v.string(),
  familyName: v.string(),
  image: v.string(),
  username: v.string(),
  // email
  email: v.string(),
})

export function getUserNameFromCommonAuthProvider(
  user: Pick<CommonAuthProvider, "givenName" | "familyName" | "username" | "email">,
  ifMissing: string,
): string {
  if (user.givenName && user.familyName) return `${user.givenName} ${user.familyName}`
  if (user.givenName) return user.givenName
  if (user.familyName) return user.familyName
  if (user.username) return user.username
  if (user.email) return user.email
  return ifMissing
}
