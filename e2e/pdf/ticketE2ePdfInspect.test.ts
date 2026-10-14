import { expect, test } from "@rstest/core"
import { BarcodeFormat, QRCodeWriter } from "@zxing/library"
import { ticketE2ePdfInspect } from "./ticketE2ePdfInspect.ts"

const qrPayload = "TKT-0123456789ABCDEF0123"

function ticketPdfFixtureCreate(payload = qrPayload, qrX = 60, qrY = 390, moduleSize = 5): Buffer {
  const matrix = new QRCodeWriter().encode(payload, BarcodeFormat.QR_CODE, 41, 41, new Map())
  const drawQr = Array.from({ length: matrix.getHeight() })
    .flatMap((_, y) =>
      Array.from({ length: matrix.getWidth() }, (_, x) =>
        matrix.get(x, y)
          ? [
              `${qrX + (x + 4) * moduleSize} ${qrY + (matrix.getHeight() - 1 - y + 4) * moduleSize} ${moduleSize} ${moduleSize} re`,
            ]
          : [],
      ).flat(),
    )
    .join("\n")
  const pages = ["Ticket for offline fixture", "Second ticket page"]
  const content = pages.map((label) => `BT /F1 18 Tf 48 790 Td (${label}) Tj ET\nq 0 g\n${drawQr}\nf Q\n`)
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 7 0 R >>",
    ...content.map((stream) => `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`),
  ]
  let document = "%PDF-1.4\n"
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document))
    document += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xrefOffset = Buffer.byteLength(document)
  document += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`
  document += offsets
    .slice(1)
    .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)
    .join("")
  document += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(document, "binary")
}

function ticketCardPdfFixtureCreate(payloads: string[]): Buffer {
  const millimetersToPoints = 72 / 25.4
  const stream = payloads
    .map((payload, index) => {
      const matrix = new QRCodeWriter().encode(payload, BarcodeFormat.QR_CODE, 0, 0, new Map())
      const moduleSize = (31 * millimetersToPoints) / matrix.getWidth()
      const qrX = (63.5 + (index % 2) * 96) * millimetersToPoints
      const qrTop = (18 + Math.floor(index / 2) * 139.5) * millimetersToPoints
      const modules = Array.from({ length: matrix.getHeight() }).flatMap((_, y) =>
        Array.from({ length: matrix.getWidth() }, (_, x) =>
          matrix.get(x, y)
            ? `${qrX + x * moduleSize} ${842 - qrTop - (y + 1) * moduleSize} ${moduleSize} ${moduleSize} re`
            : "",
        ).filter(Boolean),
      )
      // Long detail values can overflow into the QR's outer quiet-zone margin.
      // Model neighboring glyphs without obscuring any actual QR modules.
      const adjacentText = `BT /F1 10 Tf ${qrX - 8} ${842 - qrTop - 60} Td (E) Tj ET\nBT /F1 10 Tf ${qrX + 32 * millimetersToPoints} ${842 - qrTop - 80} Td (8) Tj ET`
      return `BT /F1 10 Tf ${(18 + (index % 2) * 96) * millimetersToPoints} ${842 - qrTop} Td (Ticket card ${index + 1}) Tj ET\n${adjacentText}\nq 0 g\n${modules.join("\n")}\nf Q\n`
    })
    .join("\n")
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
  ]
  let document = "%PDF-1.4\n"
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document))
    document += `${index + 1} 0 obj\n${object}\nendobj\n`
  }
  const xrefOffset = Buffer.byteLength(document)
  document += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`
  document += offsets
    .slice(1)
    .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)
    .join("")
  document += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(document, "binary")
}

test("renders every ticket PDF page and decodes the QR from the rasterized pages", async () => {
  const result = await ticketE2ePdfInspect(ticketPdfFixtureCreate())

  expect(result.pages).toHaveLength(2)
  expect(result.pages.map((page) => page.page)).toEqual([1, 2])
  expect(result.text).toContain("Ticket for offline fixture")
  expect(result.text).toContain("Second ticket page")
  expect(result.decodedQrPayloads).toEqual([qrPayload])
  expect(result.pages.every((page) => page.qrPayload === qrPayload)).toBe(true)
})

test("decodes varied issued-code payloads from a small vector QR in the ticket's upper-right column", async () => {
  for (const payload of ["TKT-7DB8F7E19BA943999121", "TKT-AAAAAAAAAAAAAAAAAAAA", "TKT-1234567890ABCDEF0123"]) {
    const result = await ticketE2ePdfInspect(ticketPdfFixtureCreate(payload, 390, 620, 3))
    expect(result.decodedQrPayloads).toEqual([payload])
  }
})

test("decodes every distinct ticket QR in the delivered four-card A4 layout", async () => {
  const payloads = [qrPayload, "TKT-AAAAAAAAAAAAAAAAAAAA", "TKT-7DB8F7E19BA943999121", "TKT-1234567890ABCDEF0123"]
  const result = await ticketE2ePdfInspect(ticketCardPdfFixtureCreate(payloads))
  expect(result.pages).toHaveLength(1)
  expect(result.decodedQrPayloads).toEqual(payloads)
})

test("decodes a single delivered card despite neighboring text and three empty page slots", async () => {
  const result = await ticketE2ePdfInspect(ticketCardPdfFixtureCreate([qrPayload]))
  expect(result.pages).toHaveLength(1)
  expect(result.pages[0]?.qrPayloads).toEqual([qrPayload])
  expect(result.decodedQrPayloads).toEqual([qrPayload])
})
