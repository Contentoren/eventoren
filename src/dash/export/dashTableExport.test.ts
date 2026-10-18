import { expect, test } from "bun:test"
import { dashTableExportBuild } from "./dashTableExport.ts"

const demoInput: {
  fileParts: string[]
  title: string
  subtitle: string
  columns: { header: string; align?: "left" | "right" | "center" }[]
  rows: (string | number | null)[][]
  now: Date
} = {
  fileParts: ["Teilnehmerliste", "Indie Night"],
  title: "Teilnehmerliste · Indie Night",
  subtitle: "Kulturhaus Lindenhof",
  columns: [{ header: "Name" }, { header: "Art", align: "center" }, { header: "Betrag", align: "right" }],
  rows: [
    ["Lea Schneider", "Stehplatz", 25],
    ["Max Öztürk", "Ermäßigt", 18],
  ],
  now: new Date("2026-10-18T10:00:00.000Z"),
}

test("CSV-Pfad baut Dateiname, MIME-Typ und BOM-Inhalt", async () => {
  const result = await dashTableExportBuild({ ...demoInput, format: "csv" })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.fileName).toBe("teilnehmerliste_indie-night_2026-10-18.csv")
  expect(result.data.mimeType).toBe("text/csv;charset=utf-8")
  expect(typeof result.data.data).toBe("string")
  expect(result.data.data as string).toStartWith("﻿Name;Art;Betrag\r\n")
})

test("XLSX-Pfad baut ein entpackbares Tabellen-Dokument", async () => {
  const result = await dashTableExportBuild({ ...demoInput, format: "xlsx" })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.fileName).toBe("teilnehmerliste_indie-night_2026-10-18.xlsx")
  expect(result.data.mimeType).toContain("spreadsheetml")
  expect(result.data.data).toBeInstanceOf(Uint8Array)
  expect((result.data.data as Uint8Array).slice(0, 2)).toEqual(new Uint8Array([0x50, 0x4b]))
})

test("filtert leere Namensbestandteile aus dem Dateinamen", async () => {
  const result = await dashTableExportBuild({ ...demoInput, format: "csv", fileParts: ["", "Liste"] })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.fileName).toBe("liste_2026-10-18.csv")
})
