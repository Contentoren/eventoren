import type { DashScan } from "../../../model/dashScanSchema.ts"
import type { DashScanResult } from "../../../model/dashScanResultSchema.ts"

export type DashCheckinScanFilter = "alle" | "akzeptiert" | "abgelehnt"

export const dashCheckinRejectionLabels: Record<Exclude<DashScanResult, "ok">, string> = {
  doppelt: "Doppelt eingescannt",
  "falsches-event": "Falsches Event",
  unbekannt: "Unbekannter Code",
  storniert: "Storniert",
}

export function dashCheckinScanFilter(scans: DashScan[], filter: DashCheckinScanFilter): DashScan[] {
  if (filter === "akzeptiert") return scans.filter((scan) => scan.result === "ok")
  if (filter === "abgelehnt") return scans.filter((scan) => scan.result !== "ok")
  return scans
}
