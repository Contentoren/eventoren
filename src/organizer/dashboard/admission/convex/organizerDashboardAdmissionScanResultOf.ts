import type { OrganizerDashboardAdmissionScanResult } from "../model/organizerDashboardAdmissionScanResultSchema.ts"

/**
 * Maps canonical check-in error codes to public rejected-scan reasons.
 * Unknown codes stay "unbekannt" with the backend code preserved as reason.
 */
export function organizerDashboardAdmissionScanResultOf(
  code: string | undefined,
): Exclude<OrganizerDashboardAdmissionScanResult, "ok"> {
  if (!code) return "unbekannt"
  if (code.includes("cancelled")) return "storniert"
  if (code.includes("unpaid")) return "unbezahlt"
  if (code.includes("duplicate") || code.includes("already")) return "doppelt"
  if (code.includes("wrong-event") || code.includes("ambiguous") || code.includes("order-code")) {
    return "falsches-event"
  }
  return "unbekannt"
}
