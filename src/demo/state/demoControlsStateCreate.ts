import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import { demoScenarioGroupListGet } from "../model/demoScenarioGroupListGet.ts"
import { demoText } from "../model/demoText.ts"

export function demoControlsStateCreate(input?: { readonly currentId?: () => string }) {
  const open = createSignalObject(false)
  const hidden = demoControlsHiddenRead()
  const groups = () => demoScenarioGroupListGet()

  const quickEntries = () => [
    {
      title: demoText("quickEntryCustomer"),
      path: "/demo/customer/events",
      badge: "Kunden",
    },
    {
      title: demoText("quickEntryAdmin"),
      path: "/demo/admin/events",
      badge: "Admin",
    },
    {
      title: demoText("quickEntryScanner"),
      path: "/demo/admin/organizer",
      badge: "Einlass",
    },
  ]

  const isCurrent = (id: string) => {
    if (!input?.currentId) return false
    return input.currentId() === id
  }

  return {
    open: open.get,
    hidden,
    groups,
    quickEntries,
    isCurrent,
    openOverlay: () => open.set(true),
    closeOverlay: () => open.set(false),
    buttonText: () => demoText("controlsButton"),
    titleText: () => demoText("controlsTitle"),
    closeText: () => demoText("controlsClose"),
    directoryText: () => demoText("controlsDirectory"),
    quickEntriesTitle: () => demoText("quickEntriesTitle"),
  }
}

function demoControlsHiddenRead() {
  if (typeof window === "undefined") return false
  return new URL(window.location.href).searchParams.get("demoControls") === "hidden"
}
