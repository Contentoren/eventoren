import { demoScenarioGroupListGet } from "../model/demoScenarioGroupListGet.ts"
import { demoText } from "../model/demoText.ts"

export function demoDirectoryStateCreate() {
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

  return {
    groups,
    quickEntries,
    eyebrow: () => demoText("directoryEyebrow"),
    title: () => demoText("directoryTitle"),
    description: () => demoText("directoryDescription"),
    openText: () => demoText("open"),
    quickEntriesTitle: () => demoText("quickEntriesTitle"),
  }
}
