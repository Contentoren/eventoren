import { createError, createResult, type PromiseResult } from "#result"
import { envAuthSecretResult } from "#src/app/env/private/envAuthSecretResult.ts"
import { createToken } from "#src/auth/server/jwt_token/createToken.ts"
import { tokenValidDurationInDays } from "#src/auth/server/jwt_token/tokenValidDurationInDays.ts"
import type { OrgRole } from "#src/org/org_model_field/orgRole.ts"

export async function createTokenResult(userId: string, orgHandle?: string, orgRole?: OrgRole): PromiseResult<string> {
  const expiresInDays = tokenValidDurationInDays
  const op = "createTokenResult"
  console.log(op, userId)
  // env variable
  const saltResult = envAuthSecretResult()
  if (!saltResult.success) return saltResult
  const salt = saltResult.data
  // token
  const payload: Record<string, string> = {}
  if (orgHandle) payload.orgHandle = orgHandle
  if (orgRole) payload.orgRole = orgRole
  const token = await createToken(userId, salt, payload, expiresInDays)
  if (!token) return createError(op, "empty salt")
  return createResult(token)
}
