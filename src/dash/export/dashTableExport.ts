import { createResult, createResultError, type Result } from "#result"
import { dashCsvCreate } from "./dashCsvCreate.ts"
import { dashDownload } from "./dashDownload.ts"
import { dashFileNameCreate } from "./dashFileNameCreate.ts"
import { dashPdfTableCreate } from "./dashPdfTableCreate.ts"
import type { DashXlsxSheet } from "./dashXlsxCreate.ts"
import { dashXlsxCreate } from "./dashXlsxCreate.ts"

export type DashTableExportFormat = "csv" | "xlsx" | "pdf"

export type DashTableExportColumn = {
  readonly header: string
  readonly align?: "left" | "right" | "center"
  readonly width?: number
}

export type DashTableExportInput = {
  readonly format: DashTableExportFormat
  readonly fileParts: string[]
  readonly title: string
  readonly subtitle?: string
  readonly columns: DashTableExportColumn[]
  readonly rows: (string | number | null)[][]
  readonly checkboxColumn?: boolean
  readonly orientation?: "portrait" | "landscape"
  readonly now: Date
}

export type DashTableExportBuilt = {
  readonly fileName: string
  readonly mimeType: string
  readonly data: string | Uint8Array
}

const op = "dashTableExport"

const dashTableExportMimeTypes: Record<DashTableExportFormat, string> = {
  csv: "text/csv;charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
}

/**
 * Baut eine Tabellen-Datei (CSV, Excel oder druckfertiges PDF).
 * Zahlen bleiben Zahlen; die Darstellung übernimmt die Ziel-App.
 */
export async function dashTableExportBuild(input: DashTableExportInput): Promise<Result<DashTableExportBuilt>> {
  if (input.format === "csv") {
    return createResult<DashTableExportBuilt>({
      fileName: dashFileNameCreate(input.fileParts, "csv", input.now),
      mimeType: dashTableExportMimeTypes.csv,
      data: dashCsvCreate(
        input.columns.map((column) => column.header),
        input.rows,
      ),
    })
  }
  if (input.format === "xlsx") {
    const sheet: DashXlsxSheet = {
      name: input.title,
      header: input.columns.map((column) => column.header),
      rows: input.rows,
    }
    return createResult<DashTableExportBuilt>({
      fileName: dashFileNameCreate(input.fileParts, "xlsx", input.now),
      mimeType: dashTableExportMimeTypes.xlsx,
      data: dashXlsxCreate([sheet]),
    })
  }
  const pdf = await dashPdfTableCreate({
    title: input.title,
    subtitle: input.subtitle,
    orientation: input.orientation ?? "landscape",
    columns: input.columns.map((column) => ({ header: column.header, width: column.width, align: column.align })),
    rows: input.rows.map((row) => row.map((cell) => (cell === null ? "" : String(cell)))),
    checkboxColumn: input.checkboxColumn ?? false,
  })
  if (!pdf.success) return createResultError(op, pdf.errorMessage, pdf.errorData)
  return createResult<DashTableExportBuilt>({
    fileName: dashFileNameCreate(input.fileParts, "pdf", input.now),
    mimeType: dashTableExportMimeTypes.pdf,
    data: pdf.data,
  })
}

/** Baut die Datei und lädt sie per dashDownload herunter. */
export async function dashTableExport(input: DashTableExportInput): Promise<Result<void>> {
  const built = await dashTableExportBuild(input)
  if (!built.success) return createResultError(op, built.errorMessage, built.errorData)
  dashDownload(built.data.fileName, built.data.data, built.data.mimeType)
  return createResult(undefined)
}
