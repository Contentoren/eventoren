import { dashZipCreate } from "./dashZipCreate.ts"

export type DashXlsxSheet = {
  readonly name: string
  readonly header: string[]
  readonly rows: (string | number | null)[][]
  readonly columnWidths?: number[]
}

function dashXlsxTextEscape(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function dashXlsxColumnLetter(index: number): string {
  let letters = ""
  let rest = index
  while (rest >= 0) {
    letters = String.fromCharCode(65 + (rest % 26)) + letters
    rest = Math.floor(rest / 26) - 1
  }
  return letters
}

function dashXlsxSheetNameSanitize(name: string, used: Set<string>): string {
  const cleaned = name
    .replaceAll(/[[\]:*?/]/g, " ")
    .replaceAll(/[\x00-\x1f]/g, "")
    .replaceAll(/\s+/g, " ")
    .trim()
    .slice(0, 31)
  const base = cleaned.length > 0 ? cleaned : "Tabelle"
  let candidate = base
  let counter = 2
  while (used.has(candidate)) {
    const suffix = ` (${counter})`
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`
    counter += 1
  }
  used.add(candidate)
  return candidate
}

function dashXlsxCellXml(reference: string, cell: string | number | null, header: boolean): string {
  if (cell === null) return `<c r="${reference}"/>`
  if (typeof cell === "number") return `<c r="${reference}"><v>${String(cell)}</v></c>`
  const style = header ? ` s="1"` : ""
  return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${dashXlsxTextEscape(cell)}</t></is></c>`
}

function dashXlsxSheetXml(sheet: DashXlsxSheet): string {
  const columnCount = Math.max(sheet.header.length, ...sheet.rows.map((row) => row.length))
  const lastColumn = dashXlsxColumnLetter(Math.max(columnCount - 1, 0))
  const lastRow = sheet.rows.length + 1
  const columnWidths = sheet.columnWidths
    ?.slice(0, columnCount)
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join("")
  const headerCells = sheet.header
    .map((cell, index) => dashXlsxCellXml(`${dashXlsxColumnLetter(index)}1`, cell, true))
    .join("")
  const bodyRows = sheet.rows
    .map((row, rowIndex) => {
      const cells = Array.from({ length: columnCount }, (_, index) =>
        dashXlsxCellXml(`${dashXlsxColumnLetter(index)}${rowIndex + 2}`, row[index] ?? null, false),
      ).join("")
      return `<row r="${rowIndex + 2}">${cells}</row>`
    })
    .join("")
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${lastColumn}${lastRow}"/>` +
    `<sheetViews><sheetView workbookViewId="0">` +
    `<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>` +
    `<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>` +
    `</sheetView></sheetViews>` +
    (columnWidths ? `<cols>${columnWidths}</cols>` : "") +
    `<sheetData><row r="1">${headerCells}</row>${bodyRows}</sheetData>` +
    `<autoFilter ref="A1:${lastColumn}${lastRow}"/>` +
    `</worksheet>`
  )
}

const dashXlsxStylesXml =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="2">` +
  `<font><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><name val="Calibri"/></font>` +
  `</fonts>` +
  `<fills count="1"><fill><patternFill patternType="none"/></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="2">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `</cellXfs>` +
  `</styleSheet>`

export function dashXlsxCreate(sheets: DashXlsxSheet[]): Uint8Array {
  const encoder = new TextEncoder()
  const used = new Set<string>()
  const names = sheets.map((sheet) => dashXlsxSheetNameSanitize(sheet.name, used))
  const workbookSheets = names
    .map((name, index) => `<sheet name="${dashXlsxTextEscape(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join("")
  const workbookRels = names
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join("")
  const contentOverrides = names
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("")
  const files = [
    {
      path: "[Content_Types].xml",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
          `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
          contentOverrides +
          `</Types>`,
      ),
    },
    {
      path: "_rels/.rels",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
          `</Relationships>`,
      ),
    },
    {
      path: "xl/workbook.xml",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
          `<sheets>${workbookSheets}</sheets>` +
          `</workbook>`,
      ),
    },
    {
      path: "xl/_rels/workbook.xml.rels",
      data: encoder.encode(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
          `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
          `<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="../styles.xml"/>` +
          workbookRels +
          `</Relationships>`,
      ),
    },
    { path: "xl/styles.xml", data: encoder.encode(dashXlsxStylesXml) },
    ...names.map((_, index) => ({
      path: `xl/worksheets/sheet${index + 1}.xml`,
      data: encoder.encode(dashXlsxSheetXml(sheets[index]!)),
    })),
  ]
  return dashZipCreate(files)
}
