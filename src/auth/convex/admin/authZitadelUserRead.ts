import { createResult, createResultError, type PromiseResult } from "#result"
import { authZitadelManagementRequest } from "#src/auth/server/authZitadelManagementRequest.ts"

type ZitadelUser = {
  avatarUrl?: string
  displayName: string
  email?: string
  firstName: string
  id: string
  lastName: string
  preferredLoginName?: string
  userName: string
}

export async function authZitadelUserRead(userId: string): PromiseResult<ZitadelUser> {
  const op = "authZitadelUserRead"
  const responseResult = await authZitadelManagementRequest({
    method: "GET",
    path: `/management/v1/users/${encodeURIComponent(userId)}`,
  })
  if (!responseResult.success) return responseResult
  const response = asRecord(responseResult.data)
  const user = zitadelUserParse(response?.user)
  if (!user) return createResultError(op, "ZITADEL user response is malformed")
  return createResult(user)
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function zitadelUserParse(value: unknown): ZitadelUser | undefined {
  const user = asRecord(value)
  if (!user) return undefined
  const human = asRecord(user.human)
  const profile = asRecord(human?.profile)
  const emailData = asRecord(human?.email)
  const id = stringValue(user.id)
  const userName = stringValue(user.userName) ?? stringValue(user.preferredLoginName)
  if (!id || !userName) return undefined
  const firstName = stringValue(profile?.firstName) ?? ""
  const lastName = stringValue(profile?.lastName) ?? ""
  const displayName = stringValue(profile?.displayName) ?? ([firstName, lastName].filter(Boolean).join(" ") || userName)
  return {
    avatarUrl: stringValue(profile?.avatarUrl),
    displayName,
    email: stringValue(emailData?.email),
    firstName,
    id,
    lastName,
    preferredLoginName: stringValue(user.preferredLoginName),
    userName,
  }
}
