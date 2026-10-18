import type { DropdownMenuEntry } from "#ui/interactive/menu/DropdownMenu.jsx"
import { dashExportMenuItemsCreate, type DashExportGroup, type DashExportMenuProps } from "./DashExportMenu.tsx"

export function dashExportMenuStateCreate(inputs: {
  groups: () => DashExportGroup[]
  onExport: () => DashExportMenuProps["onExport"]
}) {
  const items = (): DropdownMenuEntry[] => dashExportMenuItemsCreate(inputs.groups(), inputs.onExport())

  return { items }
}

export type DashExportMenuState = ReturnType<typeof dashExportMenuStateCreate>
