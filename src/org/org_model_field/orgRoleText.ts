import type { OrgRole } from "#src/org/org_model_field/orgRole.ts"
import { ttt } from "#ui/i18n/ttt.ts"

export const orgRoleText = {
  member: ttt("Member"),
  guest: ttt("Guest"),
} as const satisfies Record<OrgRole, string>
