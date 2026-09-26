import { useLocation } from "@tanstack/solid-router"
import { createEffect, on } from "solid-js"
import { userRoleIsAdmin } from "#src/auth/model_field/userRoleIsAdmin.ts"
import { eventorenAuthContextUse } from "#src/auth/ui/eventorenAuthContextUse.ts"
import { eventorenAuthControlStateCreate } from "#src/auth/ui/eventorenAuthControlStateCreate.ts"
import { adminListViewPreferenceStateCreate } from "#src/viewPreference/adminListViewPreferenceStateCreate.ts"
import { createSidebarState } from "#ui/interactive/sidebar/createSidebarState.jsx"
import { adminShellNavigationResolve } from "./adminShellNavigationResolve.ts"

export function adminShellStateCreate(area: "admin" | "organizer" = "admin") {
  const sidebarState = createSidebarState()
  const authState = eventorenAuthControlStateCreate()
  const listViewPreference = adminListViewPreferenceStateCreate()
  const auth = eventorenAuthContextUse()
  const location = useLocation()

  const isAdmin = () => {
    const user = auth.identity()
    return user ? userRoleIsAdmin(user.role) : false
  }

  const navigation = () => adminShellNavigationResolve(area, isAdmin())

  createEffect(
    on(
      () => location().pathname,
      () => sidebarState.openMobile.set(false),
      { defer: true },
    ),
  )

  const activeNavigationItem = () => {
    const nav = navigation()
    return (
      nav.find((item) => location().pathname === item.href || location().pathname.startsWith(`${item.href}/`)) ?? nav[0]
    )
  }

  return {
    areaLabel: () => (area === "organizer" && !isAdmin() ? "Veranstalter" : "Admin"),
    activeNavigationHref: () => activeNavigationItem().href,
    isAdmin,
    logout: authState.logout,
    listViewPreference,
    navigation,
    sidebarState,
    user: () => auth.identity() ?? undefined,
  }
}
