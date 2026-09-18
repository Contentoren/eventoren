import type { Language } from "../app/i18n/language.ts"
import type { UserRole } from "../auth/model_field/userRole.ts"
import { userRoleCanAccessOrganizer, userRoleIsDevOrAdmin } from "../auth/model_field/userRole.ts"
import type { SiteHeaderNavLink } from "./SiteHeaderNavLink.ts"

export function siteHeaderNavLinks(
  _language: Language,
  role?: UserRole,
  sessionHydrated = true,
): readonly SiteHeaderNavLink[] {
  const activeRole = sessionHydrated ? role : undefined
  return [
    { to: "/", label: "Events entdecken", exact: true },
    ...(activeRole && userRoleCanAccessOrganizer(activeRole)
      ? [{ to: "/organizer" as const, label: "Veranstalter", exact: false }]
      : []),
    ...(activeRole && userRoleIsDevOrAdmin(activeRole)
      ? [{ to: "/admin" as const, label: "Verwaltung", exact: false }]
      : []),
  ] satisfies readonly SiteHeaderNavLink[]
}
