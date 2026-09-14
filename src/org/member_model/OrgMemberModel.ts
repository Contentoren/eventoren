import type { OrgRole } from "#src/org/org_model_field/orgRole.ts"
import type { HasCreatedAtUpdatedAt } from "#src/utils/data/HasCreatedAtUpdatedAt.ts"

export type OrgMemberDataModel = {
  memberId: string
  orgHandle: string
  userId: string
  role: OrgRole
  invitedBy: string
}

export interface OrgMemberModel extends OrgMemberDataModel, HasCreatedAtUpdatedAt {}
