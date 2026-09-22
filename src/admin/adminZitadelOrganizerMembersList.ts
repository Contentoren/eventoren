import type { ConvexHttpClient } from "convex/browser"
import { apiClientCreate } from "../client/apiClient.ts"
import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { AdminZitadelMember } from "./AdminZitadelMember.ts"
import { adminZitadelMembersList } from "./adminZitadelMembersList.ts"

const pageSize = 100
const op = "adminZitadelOrganizerMembersList"

export async function adminZitadelOrganizerMembersList(
  input: { readonly token: string },
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<{ readonly members: readonly AdminZitadelMember[]; readonly total: number }>> {
  const members: AdminZitadelMember[] = []
  let offset = 0
  let directoryTotal = 0

  do {
    const result = await adminZitadelMembersList({ limit: pageSize, offset, token: input.token }, client)
    if (!result.success) return createResultError(op, result.errorMessage, result)
    directoryTotal = result.data.total
    members.push(...result.data.members.filter((member) => member.organizerGranted))
    if (result.data.members.length === 0) break
    offset += result.data.members.length
  } while (offset < directoryTotal)

  return createResult({ members, total: members.length })
}
