import { v } from "convex/values"
import { internalMutation, type MutationCtx } from "#convex/_generated/server.js"
import type { IdAuthUserEmailRegistration } from "#src/auth/convex/IdUser.ts"
import { nowIso } from "#utils/date/nowIso.js"

export const signUpCodeFields = {
  name: v.string(),
  email: v.string(),
  hashedPassword: v.optional(v.string()),
  code: v.string(),
} as const

export type SignUpCodeValidatorType = typeof signUpCodeValidator.type
export const signUpCodeValidator = v.object(signUpCodeFields)

export const signUp2InternalMutation = internalMutation({
  args: signUpCodeValidator,
  handler: signUp2InternalMutationFn,
})

export async function signUp2InternalMutationFn(
  ctx: MutationCtx,
  args: SignUpCodeValidatorType,
): Promise<{ id: IdAuthUserEmailRegistration }> {
  const { name, email, hashedPassword, code } = args

  const id = await ctx.db.insert("authUserEmailRegistrations", {
    email,
    code,
    name,
    hashedPassword,
    createdAt: nowIso(),
    consumedAt: undefined,
  })

  return { id }
}
