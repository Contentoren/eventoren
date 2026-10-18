import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import type { DashEntrance } from "../../../model/dashEntranceSchema.ts"
import type { DashScannerLink } from "../../../model/dashScannerLinkSchema.ts"
import { dashScannerLinkCreate } from "../../../store/actions/checkin/dashScannerLinkCreate.ts"
import { dashScannerLinkRevoke } from "../../../store/actions/checkin/dashScannerLinkRevoke.ts"

const entrances: DashEntrance[] = ["Haupteingang", "Seiteneingang", "Abendkasse"]

/** Zustand Scanner-Links: Liste, QR-Ansicht, Widerrufen-Bestätigung und Erstellen-Sheet. */
export function dashCheckinLinksStateCreate(inputs: { eventId: () => string }) {
  const qrLink = createSignalObject<DashScannerLink | null>(null)
  const revokeLink = createSignalObject<DashScannerLink | null>(null)
  const createOpen = createSignalObject(false)
  const label = createSignalObject("")
  const entrance = createSignalObject<DashEntrance>("Haupteingang")

  const links = () =>
    dashStateGet()
      .scannerLinks.filter((link) => link.eventId === inputs.eventId())
      .sort((left, right) => (left.createdAt < right.createdAt ? 1 : -1))

  const openQr = (link: DashScannerLink) => qrLink.set(link)
  const closeQr = () => qrLink.set(null)
  const askRevoke = (link: DashScannerLink) => revokeLink.set(link)
  const closeRevoke = () => revokeLink.set(null)
  const openCreate = () => {
    label.set("")
    entrance.set("Haupteingang")
    createOpen.set(true)
  }
  const closeCreate = () => createOpen.set(false)

  const create = () => {
    const result = dashScannerLinkCreate({ eventId: inputs.eventId(), label: label.get(), entrance: entrance.get() })
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: `Scanner-Link „${result.data.label}“ erstellt`, variant: "success" })
    createOpen.set(false)
    qrLink.set(result.data)
  }

  const revoke = () => {
    const link = revokeLink.get()
    if (!link) return
    const result = dashScannerLinkRevoke(link.id)
    revokeLink.set(null)
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: `Scanner-Link „${link.label}“ widerrufen`, variant: "success" })
  }

  return {
    links,
    entrances,
    qrLink,
    revokeLink,
    createOpen,
    label,
    entrance,
    openQr,
    closeQr,
    askRevoke,
    closeRevoke,
    openCreate,
    closeCreate,
    create,
    revoke,
  }
}

export type DashCheckinLinksState = ReturnType<typeof dashCheckinLinksStateCreate>
