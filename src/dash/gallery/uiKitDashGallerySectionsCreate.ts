import type { DashStatusPillKind } from "#src/dash/ui/status/dashStatusPillResolve.ts"

export interface UiKitDashPillExample {
  kind: DashStatusPillKind
  values: string[]
}

export function uiKitDashGallerySectionsCreate(): {
  pillExamples: UiKitDashPillExample[]
  markdownSample: string
  formatterSamples: { iso: string; cents: number }[]
} {
  return {
    pillExamples: [
      { kind: "event", values: ["entwurf", "im-verkauf", "pausiert", "ausverkauft", "live", "beendet", "abgesagt"] },
      { kind: "order", values: ["bezahlt", "offen", "storniert", "erstattet", "teilerstattet"] },
      { kind: "ticket", values: ["gueltig", "eingecheckt", "storniert"] },
      { kind: "org", values: ["pruefung", "aktiv", "gesperrt"] },
      { kind: "payout", values: ["geplant", "bereit", "ausgezahlt"] },
      { kind: "voucher", values: ["aktiv", "eingeloest", "abgelaufen", "deaktiviert"] },
      { kind: "message", values: ["entwurf", "geplant", "gesendet"] },
      { kind: "scan", values: ["ok", "doppelt", "falsches-event", "unbekannt", "storniert"] },
      { kind: "boxOffice", values: ["wartet", "bezahlt", "abgebrochen"] },
      { kind: "member", values: ["aktiv", "eingeladen"] },
      { kind: "phase", values: ["geplant", "aktiv", "ausverkauft", "beendet"] },
      { kind: "visibility", values: ["oeffentlich", "nicht-gelistet"] },
    ],
    markdownSample:
      "## Jazz & Wein\n\nEin Abend mit **Live-Musik** und *Naturweinen* im Hof.\n\n- Einlass ab 19:00\n- Beginn 20:00\n\n[Programm ansehen](https://example.de/programm)",
    formatterSamples: [
      { iso: "2026-11-07T19:00:00.000Z", cents: 2550 },
      { iso: "2026-07-07T18:00:00.000Z", cents: 123450 },
      { iso: "2026-11-04T22:30:00.000Z", cents: -1200 },
    ],
  }
}
