import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import { dashTicketScan } from "../../../store/actions/dashTicketScan.ts"
import type { DashScan } from "../../../model/dashScanSchema.ts"

export type DashCheckinManualResult = {
  ok: boolean
  headline: string
  detail: string | null
}

function manualLabelCreate(code: string, scan: DashScan): DashCheckinManualResult {
  const ticket = scan.ticketId ? dashStateGet().tickets.find((entry) => entry.id === scan.ticketId) : null
  const name = ticket?.holderName ?? code
  if (scan.result !== "ok") {
    const reason =
      scan.result === "doppelt"
        ? "Bereits eingecheckt"
        : scan.result === "falsches-event"
          ? "Ticket gehört zu einem anderen Event"
          : scan.result === "storniert"
            ? "Ticket ist storniert"
            : "Unbekannter Code"
    return { ok: false, headline: reason, detail: `${name} · ${scan.code}` }
  }
  const typeName = dashStateGet().ticketTypes.find((type) => type.id === ticket?.ticketTypeId)?.name ?? "Ticket"
  return { ok: true, headline: `Eingecheckt · ${name}`, detail: typeName }
}

/** Zustand manuelles Einchecken: Code-Eingabe, Prüfung und Ergebnis. */
export function dashCheckinManualStateCreate(inputs: { eventId: () => string }) {
  const code = createSignalObject("")
  const result = createSignalObject<DashCheckinManualResult | null>(null)

  const check = () => {
    const scanResult = dashTicketScan(inputs.eventId(), code.get(), "Haupteingang", "Dashboard")
    if (!scanResult.success) {
      result.set({ ok: false, headline: scanResult.errorMessage, detail: null })
      return
    }
    result.set(manualLabelCreate(code.get().trim().toUpperCase(), scanResult.data))
    code.set("")
  }

  return { code, result, check }
}

export type DashCheckinManualState = ReturnType<typeof dashCheckinManualStateCreate>
