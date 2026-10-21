import { dashCentsFormat } from "#src/dash/model/dashCentsFormat.ts"
import { dashCsvCreate } from "#src/dash/export/dashCsvCreate.ts"
import { dashXlsxCreate } from "#src/dash/export/dashXlsxCreate.ts"
import { dashPdfTableCreate } from "#src/dash/export/dashPdfTableCreate.ts"
import type { Result } from "#result"
import type { OrganizerDashboardExportKind } from "./organizerDashboardExportFilterSchema.ts"

export type OrganizerDashboardExportParticipant = {
  readonly name: string
  readonly email: string
  readonly tierName: string
  readonly code: string
  readonly cancelled: boolean
  readonly checkedInAt: string | undefined
}

export type OrganizerDashboardExportOrder = {
  readonly bookingNumber: string
  readonly buyerName: string
  readonly buyerEmail: string
  readonly status: string
  readonly totalCents: number
  readonly createdAt: string
}

export type OrganizerDashboardExportCheckIn = {
  readonly ticketCode: string
  readonly participantName: string
  readonly action: string
  readonly occurredAt: string
  readonly entrance: string
  readonly operatorName: string
}

const berlinDateTime = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const berlinDate = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

function berlinDateTimeFormat(iso: string): string {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return iso
  return berlinDateTime.format(new Date(time))
}

function berlinDateFormat(iso: string): string {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return iso
  return berlinDate.format(new Date(time))
}

/** Column headers per export kind (German, fixed order). */
export function organizerDashboardExportHeaderGet(kind: OrganizerDashboardExportKind): string[] {
  switch (kind) {
    case "teilnehmer":
      return ["Name", "E-Mail", "Ticketart", "Code", "Status", "Eingecheckt"]
    case "bestellungen":
      return ["Bestellnummer", "Käufer", "E-Mail", "Status", "Summe", "Erstellt"]
    case "checkins":
      return ["Ticketcode", "Teilnehmer", "Aktion", "Zeitpunkt", "Eingang", "Kontrolle"]
  }
}

function participantStatusText(cancelled: boolean, checkedInAt: string | undefined): string {
  if (cancelled) return "storniert"
  if (checkedInAt !== undefined) return "eingecheckt"
  return "gültig"
}

/** Builds string rows for one export kind. Instants render Europe/Berlin, money in Euro. */
export function organizerDashboardExportRowsCreate(
  kind: OrganizerDashboardExportKind,
  items: readonly (
    | OrganizerDashboardExportParticipant
    | OrganizerDashboardExportOrder
    | OrganizerDashboardExportCheckIn
  )[],
): string[][] {
  switch (kind) {
    case "teilnehmer":
      return (items as readonly OrganizerDashboardExportParticipant[]).map((item) => [
        item.name,
        item.email,
        item.tierName,
        item.code,
        participantStatusText(item.cancelled, item.checkedInAt),
        item.checkedInAt === undefined ? "" : berlinDateTimeFormat(item.checkedInAt),
      ])
    case "bestellungen":
      return (items as readonly OrganizerDashboardExportOrder[]).map((item) => [
        item.bookingNumber,
        item.buyerName,
        item.buyerEmail,
        item.status,
        dashCentsFormat(item.totalCents),
        berlinDateFormat(item.createdAt),
      ])
    case "checkins":
      return (items as readonly OrganizerDashboardExportCheckIn[]).map((item) => [
        item.ticketCode,
        item.participantName,
        item.action,
        berlinDateTimeFormat(item.occurredAt),
        item.entrance,
        item.operatorName,
      ])
  }
}

/** Semicolon CSV with BOM via the shared dash helper. */
export function organizerDashboardExportCsvCreate(kind: OrganizerDashboardExportKind, rows: string[][]): string {
  return dashCsvCreate(organizerDashboardExportHeaderGet(kind), rows)
}

/** Single-sheet XLSX workbook via the shared dash helper (no new packages). */
export function organizerDashboardExportXlsxCreate(
  sheetName: string,
  kind: OrganizerDashboardExportKind,
  rows: string[][],
): Uint8Array {
  return dashXlsxCreate([{ name: sheetName, header: organizerDashboardExportHeaderGet(kind), rows }])
}

/** PDF table via the shared dash helper (lazy jspdf, no new packages). */
export function organizerDashboardExportPdfCreate(
  title: string,
  subtitle: string,
  kind: OrganizerDashboardExportKind,
  rows: string[][],
): Promise<Result<Uint8Array>> {
  return dashPdfTableCreate({
    title,
    subtitle,
    orientation: kind === "teilnehmer" ? "landscape" : "portrait",
    columns: organizerDashboardExportHeaderGet(kind).map((header) => ({ header })),
    rows,
    footerNote: "Stand: Europe/Berlin",
  })
}
