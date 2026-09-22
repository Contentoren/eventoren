import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { language } from "../../app/i18n/language.ts"
import type { SiteHeaderNavLink } from "../../components/SiteHeaderNavLink.ts"
import { siteHeaderNavLinks } from "../../components/siteHeaderNavLinks.ts"

export function demoNavigationMenuStateCreate() {
  const open = createSignalObject(true)
  const links = createMemo<readonly SiteHeaderNavLink[]>(() => siteHeaderNavLinks(language.de, "admin"))

  return {
    open: open.get,
    close: () => open.set(false),
    reopen: () => open.set(true),
    links,
    href: demoNavigationHref,
  }
}

function demoNavigationHref(path: string): string {
  if (path === "/kontakt") return "/demo/contact"
  if (path === "/organizer") return "/demo/admin/organizer"
  if (path === "/admin") return "/demo/admin/events"
  return "/demo/customer/events"
}
