import { mdiDownload } from "@adaptive-ds/mdi/mdiDownload.js"
import { mdiFileDelimitedOutline } from "@adaptive-ds/mdi/mdiFileDelimitedOutline.js"
import { mdiFileExcelOutline } from "@adaptive-ds/mdi/mdiFileExcelOutline.js"
import { mdiFilePdfBox } from "@adaptive-ds/mdi/mdiFilePdfBox.js"
import { buttonSize } from "#ui/interactive/button/buttonCva.js"
import { DropdownMenu, type DropdownMenuEntry } from "#ui/interactive/menu/DropdownMenu.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { dashExportMenuStateCreate } from "./dashExportMenuStateCreate.ts"

export type DashExportFormat = "csv" | "xlsx" | "pdf"

export interface DashExportGroup {
  id: string
  label: string
  count?: number
  formats: DashExportFormat[]
}

export interface DashExportMenuProps {
  label?: string
  groups: DashExportGroup[]
  onExport: (groupId: string, format: DashExportFormat) => Promise<void> | void
  size?: "sm" | "md"
}

const dashExportFormatMeta: Record<DashExportFormat, { label: string; icon: string; fileLabel: string }> = {
  csv: { label: "CSV", icon: mdiFileDelimitedOutline, fileLabel: "CSV-Tabelle" },
  xlsx: { label: "Excel", icon: mdiFileExcelOutline, fileLabel: "Excel-Tabelle" },
  pdf: { label: "PDF", icon: mdiFilePdfBox, fileLabel: "PDF-Tabelle" },
}

/** Export-Menü je Gruppe mit CSV/Excel/PDF-Einträgen und Erfolgs-Feedback per Toast. */
export function DashExportMenu(p: DashExportMenuProps) {
  const state = dashExportMenuStateCreate({ groups: () => p.groups, onExport: () => p.onExport })

  return (
    <DropdownMenu
      items={state.items()}
      triggerLabel={p.label ?? "Exportieren"}
      triggerIcon={mdiDownload}
      triggerSize={p.size === "md" ? buttonSize.default : buttonSize.sm}
    />
  )
}

export function dashExportMenuItemsCreate(
  groups: DashExportGroup[],
  onExport: (groupId: string, format: DashExportFormat) => Promise<void> | void,
): DropdownMenuEntry[] {
  const items: DropdownMenuEntry[] = []
  for (const [groupIndex, group] of groups.entries()) {
    if (groupIndex > 0) items.push({ type: "separator" })
    items.push({ type: "label", label: group.count === undefined ? group.label : `${group.label} · ${group.count}` })
    for (const format of group.formats) {
      const meta = dashExportFormatMeta[format]
      items.push({
        type: "item",
        id: `${group.id}:${format}`,
        label: meta.label,
        icon: meta.icon,
        hint: group.count === undefined ? undefined : `${group.count} Zeilen`,
        onSelect: () => {
          void Promise.resolve()
            .then(() => onExport(group.id, format))
            .then(() => toastAdd({ title: "Export erstellt", variant: "success" }))
            .catch(() => toastAdd({ title: "Export fehlgeschlagen", variant: "error" }))
        },
      })
    }
  }
  return items
}
