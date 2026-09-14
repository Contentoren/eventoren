import type { DocOrgMember } from "#src/org/member_convex/IdOrgMember.ts"
import type { OrgMemberModel } from "#src/org/member_model/OrgMemberModel.ts"

export function docOrgMemberToModel({ _id, _creationTime, orgId, ...rest }: DocOrgMember): OrgMemberModel {
  return { memberId: _id as string, ...rest }
}
