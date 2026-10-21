import { useLocation } from "@tanstack/solid-router"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

/** Chrome state for the Veranstalter shell: current path plus mobile drawer. */
export function veranstalterDashboardShellChromeStateCreate() {
  const location = useLocation()
  const drawer = createSignalObject(false)
  const currentPath = () => location().pathname
  const openDrawer = () => drawer.set(true)
  const closeDrawer = () => drawer.set(false)
  return { currentPath, drawer, openDrawer, closeDrawer }
}

export type VeranstalterDashboardShellChromeState = ReturnType<typeof veranstalterDashboardShellChromeStateCreate>
