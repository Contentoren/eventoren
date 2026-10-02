import type { ResultErr, ResultOk } from "#result"
import type { OrgMemberModel } from "#src/org/member_model/OrgMemberModel.ts"

export type OrgMembersListPageResult =
  | ResultErr
  | (ResultOk<OrgMemberModel[]> & { isDone: boolean; nextCursor: string | null })
