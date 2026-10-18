import { mdiBookmarkPlusOutline } from "@adaptive-ds/mdi/mdiBookmarkPlusOutline.js"
import { mdiCancel } from "@adaptive-ds/mdi/mdiCancel.js"
import { mdiContentCopy } from "@adaptive-ds/mdi/mdiContentCopy.js"
import { mdiEyeOutline } from "@adaptive-ds/mdi/mdiEyeOutline.js"
import { mdiOpenInNew } from "@adaptive-ds/mdi/mdiOpenInNew.js"
import { mdiPause } from "@adaptive-ds/mdi/mdiPause.js"
import { mdiPlay } from "@adaptive-ds/mdi/mdiPlay.js"
import type { DropdownMenuEntry } from "#ui/interactive/menu/DropdownMenu.jsx"
import type { DashEvent } from "../../../model/dashEventSchema.ts"

export interface DashEventsRowMenu {
  event: DashEvent
  canEdit: boolean
  onOpen: () => void
  onViewPublic: () => void
  onDuplicate: () => void
  onSaveTemplate: () => void
  onToggleSales: () => void
  onCancel: () => void
}

/** Baut die Einträge des Zeilen-Menüs: Öffnen, Ansehen, Duplizieren, Vorlage, Verkauf, Absagen. */
export function dashEventsRowMenuCreate(inputs: DashEventsRowMenu): Array<DropdownMenuEntry> {
  const entries: Array<DropdownMenuEntry> = [
    { type: "item", id: "oeffnen", label: "Öffnen", icon: mdiEyeOutline, onSelect: inputs.onOpen },
    { type: "item", id: "ansehen", label: "Ansehen", icon: mdiOpenInNew, onSelect: inputs.onViewPublic },
  ]
  if (!inputs.canEdit) return entries
  entries.push(
    { type: "item", id: "duplizieren", label: "Duplizieren", icon: mdiContentCopy, onSelect: inputs.onDuplicate },
    {
      type: "item",
      id: "vorlage",
      label: "Als Vorlage speichern",
      icon: mdiBookmarkPlusOutline,
      onSelect: inputs.onSaveTemplate,
    },
  )
  if (inputs.event.status === "veroeffentlicht") {
    entries.push({
      type: "item",
      id: "verkauf",
      label: inputs.event.salesPaused ? "Verkauf fortsetzen" : "Verkauf pausieren",
      icon: inputs.event.salesPaused ? mdiPlay : mdiPause,
      onSelect: inputs.onToggleSales,
    })
  }
  entries.push({ type: "separator" })
  if (inputs.event.status !== "abgesagt") {
    entries.push({
      type: "item",
      id: "absagen",
      label: "Absagen",
      icon: mdiCancel,
      tone: "danger",
      onSelect: inputs.onCancel,
    })
  }
  return entries
}
