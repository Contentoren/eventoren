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

type ZitadelUsersSearchResult = {
  total: number
  users: readonly ZitadelUser[]
}

export async function authZitadelUsersSearch(
  search: string,
  offset: number,
  limit: number,
): PromiseResult<ZitadelUsersSearchResult> {
  const op = "authZitadelUsersSearch"
  const term = search.trim()
  const textQueries = term
    ? [
        { userNameQuery: { method: "TEXT_QUERY_METHOD_CONTAINS_IGNORE_CASE", userName: term } },
        { firstNameQuery: { method: "TEXT_QUERY_METHOD_CONTAINS_IGNORE_CASE", firstName: term } },
        { lastNameQuery: { method: "TEXT_QUERY_METHOD_CONTAINS_IGNORE_CASE", lastName: term } },
        { displayNameQuery: { method: "TEXT_QUERY_METHOD_CONTAINS_IGNORE_CASE", displayName: term } },
        { emailQuery: { emailAddress: term, method: "TEXT_QUERY_METHOD_CONTAINS_IGNORE_CASE" } },
      ]
    : []
  const responseResult = await authZitadelManagementRequest({
    body: {
      queries: term ? [{ orQuery: { queries: textQueries } }] : [],
      query: { asc: true, limit, offset },
      sortingColumn: "USER_FIELD_NAME_DISPLAY_NAME",
    },
    method: "POST",
    path: "/management/v1/users/_search",
  })
  if (!responseResult.success) return responseResult
  const response = asRecord(responseResult.data)
  const rawUsers = response?.result
  if (rawUsers === undefined) return createResult({ total: 0, users: [] })
  if (!Array.isArray(rawUsers)) return createResultError(op, "ZITADEL user response is malformed")

  const users: ZitadelUser[] = []
  for (const rawUser of rawUsers) {
    const user = zitadelUserParse(rawUser)
    if (!user) return createResultError(op, "ZITADEL user response contains a malformed user")
    users.push(user)
  }
  const totalResult = asRecord(response?.details)?.totalResult
  const total = typeof totalResult === "number" ? totalResult : Number(totalResult ?? users.length)
  if (!Number.isSafeInteger(total) || total < 0)
    return createResultError(op, "ZITADEL user response has an invalid total")
  return createResult({ total, users })
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
