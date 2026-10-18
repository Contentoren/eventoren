import { expect, test } from "bun:test"
import { dashPdfQrDraw } from "./dashPdfQrDraw.ts"
import { dashPdfReportCreate } from "./dashPdfReportCreate.ts"
import { dashPdfTableCreate } from "./dashPdfTableCreate.ts"

test("PDF-Tabelle startet mit %PDF und enthält Titeltext", async () => {
  const result = await dashPdfTableCreate({
    title: "Teilnehmer · Indie Night",
    subtitle: "Lindenhof, 18.10.2026",
    orientation: "landscape",
    columns: [
      { header: "Name", width: 60 },
      { header: "Art", align: "center" },
      { header: "Betrag", align: "right" },
    ],
    rows: [
      ["Lea Schneider", "Stehplatz", "25,00 €"],
      ["Max Öztürk", "Ermäßigt", "18,00 €"],
    ],
    checkboxColumn: true,
    footerNote: "Stand 18.10.2026",
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(new TextDecoder().decode(result.data.slice(0, 4))).toBe("%PDF")
  expect(result.data.length).toBeGreaterThan(1000)
})

test("PDF-Bericht startet mit %PDF und rendert Abschnitte", async () => {
  const result = await dashPdfReportCreate({
    title: "Abrechnung · Jazz & Wein",
    subtitle: "Kulturhaus Lindenhof",
    meta: [["Zeitraum", "18.10.2026"]],
    sections: [
      {
        title: "Umsatz",
        rows: [
          { label: "Ticketumsatz brutto", value: "4.320,00 €" },
          { label: "Erstattungen", value: "−120,00 €", tone: "negative" },
          { label: "Auszahlung", value: "3.980,00 €", emphasis: true },
        ],
      },
    ],
    footerNote: "Demo-Abrechnung",
  })
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(new TextDecoder().decode(result.data.slice(0, 4))).toBe("%PDF")
  expect(result.data.length).toBeGreaterThan(1000)
})

test("QR-Draw zeichnet schwarze Rechtecke auf das Dokument", () => {
  const rects: { x: number; y: number; w: number; h: number }[] = []
  const colors: [number, number, number][] = []
  const result = dashPdfQrDraw(
    {
      setFillColor: (r: number, g: number, b: number) => {
        colors.push([r, g, b])
      },
      rect: (x: number, y: number, w: number, h: number) => {
        rects.push({ x, y, w, h })
      },
    },
    "https://eventoren.de/t/T-ABCD-1234",
    10,
    10,
    30,
  )
  expect(result.success).toBe(true)
  expect(colors).toEqual([[0, 0, 0]])
  expect(rects.length).toBeGreaterThan(100)
  for (const rect of rects) {
    expect(rect.x).toBeGreaterThanOrEqual(10)
    expect(rect.y).toBeGreaterThanOrEqual(10)
    expect(rect.x + rect.w).toBeLessThanOrEqual(40.5)
  }
})

test("QR-Draw meldet leeren Inhalt als Fehler", () => {
  const result = dashPdfQrDraw({ setFillColor: () => {}, rect: () => {} }, "", 0, 0, 10)
  expect(result.success).toBe(false)
})
