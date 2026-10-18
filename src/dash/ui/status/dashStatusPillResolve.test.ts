import { expect, test } from "bun:test"

import type { DotPillTone } from "#ui/static/pill/DotPill.jsx"

import { dashStatusPillResolve, type DashStatusPillKind } from "#src/dash/ui/status/dashStatusPillResolve.ts"

const cases: { kind: DashStatusPillKind; value: string; tone: DotPillTone; label: string; pulse?: boolean }[] = [
  { kind: "event", value: "entwurf", tone: "neutral", label: "Entwurf" },
  { kind: "event", value: "im-verkauf", tone: "brand", label: "Im Verkauf" },
  { kind: "event", value: "pausiert", tone: "warning", label: "Pausiert" },
  { kind: "event", value: "ausverkauft", tone: "success", label: "Ausverkauft" },
  { kind: "event", value: "live", tone: "brand", label: "Live", pulse: true },
  { kind: "event", value: "beendet", tone: "neutral", label: "Beendet" },
  { kind: "event", value: "abgesagt", tone: "danger", label: "Abgesagt" },
  { kind: "order", value: "bezahlt", tone: "success", label: "Bezahlt" },
  { kind: "order", value: "offen", tone: "warning", label: "Offen" },
  { kind: "order", value: "storniert", tone: "danger", label: "Storniert" },
  { kind: "order", value: "erstattet", tone: "neutral", label: "Erstattet" },
  { kind: "order", value: "teilerstattet", tone: "info", label: "Teilerstattet" },
  { kind: "ticket", value: "gueltig", tone: "success", label: "Gültig" },
  { kind: "ticket", value: "eingecheckt", tone: "brand", label: "Eingecheckt" },
  { kind: "ticket", value: "storniert", tone: "danger", label: "Storniert" },
  { kind: "org", value: "pruefung", tone: "warning", label: "In Prüfung" },
  { kind: "org", value: "aktiv", tone: "success", label: "Aktiv" },
  { kind: "org", value: "gesperrt", tone: "danger", label: "Gesperrt" },
  { kind: "payout", value: "geplant", tone: "neutral", label: "Geplant" },
  { kind: "payout", value: "bereit", tone: "warning", label: "Bereit" },
  { kind: "payout", value: "ausgezahlt", tone: "success", label: "Ausgezahlt" },
  { kind: "voucher", value: "aktiv", tone: "success", label: "Aktiv" },
  { kind: "voucher", value: "eingeloest", tone: "neutral", label: "Eingelöst" },
  { kind: "voucher", value: "abgelaufen", tone: "neutral", label: "Abgelaufen" },
  { kind: "voucher", value: "deaktiviert", tone: "danger", label: "Deaktiviert" },
  { kind: "message", value: "entwurf", tone: "neutral", label: "Entwurf" },
  { kind: "message", value: "geplant", tone: "warning", label: "Geplant" },
  { kind: "message", value: "gesendet", tone: "success", label: "Gesendet" },
  { kind: "scan", value: "ok", tone: "success", label: "Akzeptiert" },
  { kind: "scan", value: "doppelt", tone: "danger", label: "Doppelt" },
  { kind: "scan", value: "falsches-event", tone: "danger", label: "Falsches Event" },
  { kind: "scan", value: "unbekannt", tone: "danger", label: "Unbekannt" },
  { kind: "scan", value: "storniert", tone: "danger", label: "Storniert" },
  { kind: "boxOffice", value: "wartet", tone: "warning", label: "Wartet", pulse: true },
  { kind: "boxOffice", value: "bezahlt", tone: "success", label: "Bezahlt" },
  { kind: "boxOffice", value: "abgebrochen", tone: "neutral", label: "Abgebrochen" },
  { kind: "member", value: "aktiv", tone: "success", label: "Aktiv" },
  { kind: "member", value: "eingeladen", tone: "warning", label: "Eingeladen" },
  { kind: "phase", value: "geplant", tone: "neutral", label: "Geplant" },
  { kind: "phase", value: "aktiv", tone: "brand", label: "Aktiv" },
  { kind: "phase", value: "ausverkauft", tone: "warning", label: "Ausverkauft" },
  { kind: "phase", value: "beendet", tone: "neutral", label: "Beendet" },
  { kind: "visibility", value: "oeffentlich", tone: "neutral", label: "Öffentlich" },
  { kind: "visibility", value: "nicht-gelistet", tone: "neutral", label: "Nicht gelistet" },
]

for (const entry of cases) {
  test(`löst ${entry.kind}/${entry.value} zu ${entry.tone} „${entry.label}“ auf`, () => {
    expect(dashStatusPillResolve(entry.kind, entry.value)).toEqual({
      tone: entry.tone,
      label: entry.label,
      pulse: entry.pulse ?? false,
    })
  })
}

test("gibt unbekannte Werte neutral mit dem Rohwert zurück", () => {
  expect(dashStatusPillResolve("order", "zauberhaft")).toEqual({ tone: "neutral", label: "zauberhaft", pulse: false })
  expect(dashStatusPillResolve("event", "")).toEqual({ tone: "neutral", label: "", pulse: false })
})
