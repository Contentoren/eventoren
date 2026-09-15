import { createResult, createResultError, type PromiseResult } from "#result"
import { authZitadelManagementConfigRead } from "#src/auth/server/authZitadelManagementConfigRead.ts"
import { authZitadelManagementRequest } from "#src/auth/server/authZitadelManagementRequest.ts"

type ZitadelUserGrant = {
  id: string
  projectId: string
  roleKeys: readonly string[]
  state: "active" | "inactive"
  userId: string
}

export async function authZitadelUserGrantsRead(userId?: string): PromiseResult<readonly ZitadelUserGrant[]> {
  const op = "authZitadelUserGrantsRead"
  const configResult = authZitadelManagementConfigRead()
  if (!configResult.success) return configResult
  const config = configResult.data
  const grants: ZitadelUserGrant[] = []
  const limit = 1000
  for (let offset = 0; ; offset += limit) {
    const queries = [
      { projectIdQuery: { projectId: config.projectId } },
      ...(userId ? [{ userIdQuery: { userId } }] : []),
    ]
    const responseResult = await authZitadelManagementRequest({
      body: {
        queries,
        query: { asc: true, limit, offset },
      },
      method: "POST",
      path: "/management/v1/users/grants/_search",
    })
    if (!responseResult.success) return responseResult

    const response = asRecord(responseResult.data)
    const rawResult = response?.result
    if (rawResult === undefined) return createResult(grants)
    if (!Array.isArray(rawResult) || rawResult.length > limit)
      return createResultError(op, "ZITADEL grant response is malformed")

    for (const rawGrant of rawResult) {
      const grant = asRecord(rawGrant)
      if (!grant) return createResultError(op, "ZITADEL grant response contains a malformed grant")
      const id = stringValue(grant.id)
      const projectId = stringValue(grant.projectId)
      const grantUserId = stringValue(grant.userId)
      const roleKeys = grant.roleKeys === undefined ? [] : grant.roleKeys
      const state = grantStateRead(grant.state)
      if (!id || !projectId || !grantUserId || !state || !Array.isArray(roleKeys)) {
        return createResultError(op, "ZITADEL grant response contains a malformed grant")
      }
      if (roleKeys.some((roleKey) => typeof roleKey !== "string" || roleKey.length === 0)) {
        return createResultError(op, "ZITADEL grant response contains a malformed role key")
      }
      grants.push({ id, projectId, roleKeys, state, userId: grantUserId })
    }

    if (rawResult.length < limit) return createResult(grants)
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function grantStateRead(value: unknown): ZitadelUserGrant["state"] | undefined {
  if (value === 1 || value === "USER_GRANT_STATE_ACTIVE") return "active"
  if (value === 2 || value === "USER_GRANT_STATE_INACTIVE") return "inactive"
  return undefined
}
