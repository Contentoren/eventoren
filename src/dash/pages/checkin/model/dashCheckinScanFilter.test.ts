import { describe, expect, test } from "bun:test"

import type { DashScan } from "../../../model/dashScanSchema.ts"
import { dashCheckinRejectionLabels, dashCheckinScanFilter } from "./dashCheckinScanFilter.ts"

function scanCreate(id: string, result: DashScan["result"]): DashScan {
  return {
    id,
    eventId: "ev-indie-night",
    at: "2026-10-18T10:00:00.000Z",
    entrance: "Haupteingang",
    device: "Einlass Nord",
    ticketId: "ticket-1",
    code: "T-ABCD-1234",
    result,
  }
}

const scans: DashScan[] = [
  scanCreate("scan-1", "ok"),
  scanCreate("scan-2", "doppelt"),
  scanCreate("scan-3", "unbekannt"),
]

describe("dashCheckinScanFilter", () => {
  test("filtert nach akzeptiert und abgelehnt", () => {
    expect(dashCheckinScanFilter(scans, "alle")).toEqual(scans)
    expect(dashCheckinScanFilter(scans, "akzeptiert").map((scan) => scan.id)).toEqual(["scan-1"])
    expect(dashCheckinScanFilter(scans, "abgelehnt").map((scan) => scan.id)).toEqual(["scan-2", "scan-3"])
  })

  test("liefert deutsche Ablehnungsgründe", () => {
    expect(dashCheckinRejectionLabels).toEqual({
      doppelt: "Doppelt eingescannt",
      "falsches-event": "Falsches Event",
      unbekannt: "Unbekannter Code",
      storniert: "Storniert",
    })
  })
})
