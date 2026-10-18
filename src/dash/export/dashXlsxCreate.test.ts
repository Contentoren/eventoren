import { expect, test } from "bun:test"
import { dashXlsxCreate } from "./dashXlsxCreate.ts"
import { dashZipCreate } from "./dashZipCreate.ts"

function dashXlsxEntryNames(xlsx: Uint8Array): string[] {
  const view = new DataView(xlsx.buffer, xlsx.byteOffset, xlsx.byteLength)
  const eocd = xlsx.length - 22
  const count = view.getUint16(eocd + 8, true)
  const centralOffset = view.getUint32(eocd + 16, true)
  const names: string[] = []
  let offset = centralOffset
  for (let index = 0; index < count; index++) {
    const nameLength = view.getUint16(offset + 28, true)
    names.push(new TextDecoder().decode(xlsx.slice(offset + 46, offset + 46 + nameLength)))
    offset += 46 + nameLength
  }
  return names
}

function dashXlsxEntryRead(xlsx: Uint8Array, wanted: string): string {
  const view = new DataView(xlsx.buffer, xlsx.byteOffset, xlsx.byteLength)
  const names = dashXlsxEntryNames(xlsx)
  expect(names).toContain(wanted)
  const eocd = xlsx.length - 22
  const count = view.getUint16(eocd + 8, true)
  const centralOffset = view.getUint32(eocd + 16, true)
  let offset = centralOffset
  for (let index = 0; index < count; index++) {
    const nameLength = view.getUint16(offset + 28, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const headerOffset = view.getUint32(offset + 42, true)
    const name = new TextDecoder().decode(xlsx.slice(offset + 46, offset + 46 + nameLength))
    if (name === wanted) {
      const localNameLength = view.getUint16(headerOffset + 26, true)
      const start = headerOffset + 30 + localNameLength
      return new TextDecoder().decode(xlsx.slice(start, start + compressedSize))
    }
    offset += 46 + nameLength
  }
  throw new Error(`Eintrag fehlt: ${wanted}`)
}

test("enthält alle Pflichtteile des Workbook-Pakets", () => {
  const xlsx = dashXlsxCreate([{ name: "Teilnehmer", header: ["Name", "Betrag"], rows: [["Lea", 12.5]] }])
  expect(dashXlsxEntryNames(xlsx)).toEqual([
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/workbook.xml",
    "xl/_rels/workbook.xml.rels",
    "xl/styles.xml",
    "xl/worksheets/sheet1.xml",
  ])
  const sheet = dashXlsxEntryRead(xlsx, "xl/worksheets/sheet1.xml")
  expect(sheet).toContain("<c r=")
  expect(sheet).toContain("<v>12.5</v>")
  expect(sheet).toContain("inlineStr")
  expect(sheet).toContain("frozen")
  expect(sheet).toContain("autoFilter")
})

test("maskiert XML-Sonderzeichen und bereinigt Blattnamen", () => {
  const xlsx = dashXlsxCreate([
    { name: "Teilnehmer [2026]*?", header: ["A&B"], rows: [["<Lea>"]] },
    { name: "Teilnehmer [2026]*?", header: ["x"], rows: [] },
    { name: "[[[", header: ["x"], rows: [] },
  ])
  const workbook = dashXlsxEntryRead(xlsx, "xl/workbook.xml")
  expect(workbook).toContain('name="Teilnehmer 2026"')
  expect(workbook).toContain('name="Teilnehmer 2026 (2)"')
  expect(workbook).toContain('name="Tabelle"')
  const sheet = dashXlsxEntryRead(xlsx, "xl/worksheets/sheet1.xml")
  expect(sheet).toContain("A&amp;B")
  expect(sheet).toContain("&lt;Lea&gt;")
})

test("schreibt Spaltenbreiten und mehrere Blätter", () => {
  const xlsx = dashXlsxCreate([
    { name: "Eins", header: ["a"], rows: [["x"]], columnWidths: [28] },
    { name: "Zwei", header: ["b"], rows: [[null]] },
  ])
  const sheet = dashXlsxEntryRead(xlsx, "xl/worksheets/sheet1.xml")
  expect(sheet).toContain('width="28"')
  expect(workbookSheets(xlsx)).toHaveLength(2)
})

function workbookSheets(xlsx: Uint8Array): string[] {
  const workbook = dashXlsxEntryRead(xlsx, "xl/workbook.xml")
  return [...workbook.matchAll(/<sheet /g)].map((match) => match[0])
}

test("stellt dar, dass dashZipCreate leere Archive trägt", () => {
  expect(dashZipCreate([]).length).toBe(22)
})
