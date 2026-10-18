import type { DotPillTone } from "#ui/static/pill/DotPill.jsx"

export type DashStatusPillKind =
  | "event"
  | "order"
  | "ticket"
  | "org"
  | "payout"
  | "voucher"
  | "message"
  | "scan"
  | "boxOffice"
  | "member"
  | "phase"
  | "visibility"

export interface DashStatusPillResolved {
  tone: DotPillTone
  label: string
  pulse: boolean
}

const dashStatusPillTable: Record<
  DashStatusPillKind,
  Record<string, { tone: DotPillTone; label: string; pulse?: boolean }>
> = {
  event: {
    entwurf: { tone: "neutral", label: "Entwurf" },
    "im-verkauf": { tone: "brand", label: "Im Verkauf" },
    pausiert: { tone: "warning", label: "Pausiert" },
    ausverkauft: { tone: "success", label: "Ausverkauft" },
    live: { tone: "brand", label: "Live", pulse: true },
    beendet: { tone: "neutral", label: "Beendet" },
    abgesagt: { tone: "danger", label: "Abgesagt" },
  },
  order: {
    bezahlt: { tone: "success", label: "Bezahlt" },
    offen: { tone: "warning", label: "Offen" },
    storniert: { tone: "danger", label: "Storniert" },
    erstattet: { tone: "neutral", label: "Erstattet" },
    teilerstattet: { tone: "info", label: "Teilerstattet" },
  },
  ticket: {
    gueltig: { tone: "success", label: "Gültig" },
    eingecheckt: { tone: "brand", label: "Eingecheckt" },
    storniert: { tone: "danger", label: "Storniert" },
  },
  org: {
    pruefung: { tone: "warning", label: "In Prüfung" },
    aktiv: { tone: "success", label: "Aktiv" },
    gesperrt: { tone: "danger", label: "Gesperrt" },
  },
  payout: {
    geplant: { tone: "neutral", label: "Geplant" },
    bereit: { tone: "warning", label: "Bereit" },
    ausgezahlt: { tone: "success", label: "Ausgezahlt" },
  },
  voucher: {
    aktiv: { tone: "success", label: "Aktiv" },
    eingeloest: { tone: "neutral", label: "Eingelöst" },
    abgelaufen: { tone: "neutral", label: "Abgelaufen" },
    deaktiviert: { tone: "danger", label: "Deaktiviert" },
  },
  message: {
    entwurf: { tone: "neutral", label: "Entwurf" },
    geplant: { tone: "warning", label: "Geplant" },
    gesendet: { tone: "success", label: "Gesendet" },
  },
  scan: {
    ok: { tone: "success", label: "Akzeptiert" },
    doppelt: { tone: "danger", label: "Doppelt" },
    "falsches-event": { tone: "danger", label: "Falsches Event" },
    unbekannt: { tone: "danger", label: "Unbekannt" },
    storniert: { tone: "danger", label: "Storniert" },
  },
  boxOffice: {
    wartet: { tone: "warning", label: "Wartet", pulse: true },
    bezahlt: { tone: "success", label: "Bezahlt" },
    abgebrochen: { tone: "neutral", label: "Abgebrochen" },
  },
  member: {
    aktiv: { tone: "success", label: "Aktiv" },
    eingeladen: { tone: "warning", label: "Eingeladen" },
  },
  phase: {
    geplant: { tone: "neutral", label: "Geplant" },
    aktiv: { tone: "brand", label: "Aktiv" },
    ausverkauft: { tone: "warning", label: "Ausverkauft" },
    beendet: { tone: "neutral", label: "Beendet" },
  },
  visibility: {
    oeffentlich: { tone: "neutral", label: "Öffentlich" },
    "nicht-gelistet": { tone: "neutral", label: "Nicht gelistet" },
  },
}

export function dashStatusPillResolve(kind: DashStatusPillKind, value: string): DashStatusPillResolved {
  const entry = dashStatusPillTable[kind][value]
  if (!entry) return { tone: "neutral", label: value, pulse: false }
  return { tone: entry.tone, label: entry.label, pulse: entry.pulse ?? false }
}
