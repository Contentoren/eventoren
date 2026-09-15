import type { Language } from "../app/i18n/language.ts"
import type { UserRole } from "../auth/model_field/userRole.ts"
import { userRoleCanAccessOrganizer, userRoleIsDevOrAdmin } from "../auth/model_field/userRole.ts"
import type { SiteHeaderNavLink } from "./SiteHeaderNavLink.ts"

export function siteHeaderNavLinks(
  language: Language,
  role?: UserRole,
  sessionHydrated = true,
): readonly SiteHeaderNavLink[] {
  const isGerman = language === "de"
  const activeRole = sessionHydrated ? role : undefined
  return [
    { to: "/", label: isGerman ? "Events entdecken" : "Discover events", exact: true },
    ...(activeRole && userRoleCanAccessOrganizer(activeRole)
      ? [{ to: "/organizer" as const, label: isGerman ? "Veranstalter" : "Organizer", exact: false }]
      : []),
    ...(activeRole && userRoleIsDevOrAdmin(activeRole)
      ? [{ to: "/admin" as const, label: isGerman ? "Verwaltung" : "Administration", exact: false }]
      : []),
  ] satisfies readonly SiteHeaderNavLink[]
}
