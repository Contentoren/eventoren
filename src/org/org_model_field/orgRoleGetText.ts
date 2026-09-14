import { ttc } from "#src/app/i18n/ttc.ts"
import { type OrgRole, orgRole } from "#src/org/org_model_field/orgRole.ts"

export function orgRoleGetText(r: string) {
  switch (r as OrgRole) {
    case orgRole.member:
      return ttc("Member")
    case orgRole.guest:
      return ttc("Guest")
  }
}
