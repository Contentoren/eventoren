import { mdiBookOpenPageVariantOutline } from "@adaptive-ds/mdi/mdiBookOpenPageVariantOutline.js"
import { mdiCogOutline } from "@adaptive-ds/mdi/mdiCogOutline.js"
import { mdiCompassOutline } from "@adaptive-ds/mdi/mdiCompassOutline.js"
import { mdiStorefrontOutline } from "@adaptive-ds/mdi/mdiStorefrontOutline.js"
import type { Language } from "../app/i18n/language.ts"
import type { UserRole } from "../auth/model_field/userRole.ts"
import { userRoleCanAccessOrganizer } from "../auth/model_field/userRole.ts"
import { userRoleIsAdmin } from "../auth/model_field/userRoleIsAdmin.ts"
import type { SiteHeaderNavLink } from "./SiteHeaderNavLink.ts"

export function siteHeaderNavLinks(
  _language: Language,
  role?: UserRole,
  sessionHydrated = true,
): readonly SiteHeaderNavLink[] {
  const activeRole = sessionHydrated ? role : undefined
  return [
    { to: "/", label: "Events entdecken", exact: true, icon: mdiCompassOutline },
    { to: "/ratgeber", label: "Ratgeber", exact: false, icon: mdiBookOpenPageVariantOutline },
    ...(activeRole && userRoleCanAccessOrganizer(activeRole)
      ? [{ to: "/organizer" as const, label: "Veranstalter", exact: false, icon: mdiStorefrontOutline }]
      : []),
    ...(activeRole && userRoleIsAdmin(activeRole)
      ? [{ to: "/admin" as const, label: "Verwaltung", exact: false, icon: mdiCogOutline }]
      : []),
  ] satisfies readonly SiteHeaderNavLink[]
}
