import type { SiteHeaderNavLink } from "./SiteHeaderNavLink.ts"

export const siteHeaderNavLinks: readonly SiteHeaderNavLink[] = [
  { to: "/", label: "Events entdecken", exact: true },
  { to: "/meine-tickets", label: "Meine Tickets", exact: false },
]
