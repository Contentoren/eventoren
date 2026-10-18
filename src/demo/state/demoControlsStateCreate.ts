import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import { demoScenarioGroupListGet } from "../model/demoScenarioGroupListGet.ts"
import { demoText } from "../model/demoText.ts"

export function demoControlsStateCreate(input?: {
  readonly currentId?: () => string
  readonly location?: { reload: () => void }
  readonly reset?: () => void
}) {
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
      title: demoText("quickEntryPlatform"),
      path: "/demo/dashboard",
      badge: "Veranstalter",
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

  const resetDemo = () => {
    const reload = () => {
      const location = input?.location ?? (typeof window !== "undefined" ? window.location : undefined)
      location?.reload()
    }
    if (input?.reset) {
      input.reset()
      reload()
      return
    }
    // Dynamisch, damit Demo-Seiten ohne Dashboard-Store kein statisches Gewicht tragen.
    // dashStoreReset() schreibt synchron, daher läuft reload() erst nach dem Reset.
    void import("../../dash/store/dashStoreReset.ts").then((module) => {
      module.dashStoreReset()
      reload()
    })
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
    resetDemoText: () => demoText("controlsResetDemo"),
    resetDemo,
  }
}

function demoControlsHiddenRead() {
  if (typeof window === "undefined") return false
  return new URL(window.location.href).searchParams.get("demoControls") === "hidden"
}
