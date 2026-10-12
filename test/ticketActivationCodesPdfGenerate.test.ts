import { execFile } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
import { describe, expect, test } from "bun:test"
import { ticketActivationCodesPdfGenerate } from "../src/ticketing/ticketActivationCodesPdfGenerate.js"

const execFileAsync = promisify(execFile)

const ticketActivationCodesPdfTextGet = async (pdf: Uint8Array): Promise<string> => {
  const directory = mkdtempSync(join("/tmp/opencode", "activation-codes-pdf-"))
  const pdfPath = join(directory, "codes.pdf")
  writeFileSync(pdfPath, pdf)
  const { stdout } = await execFileAsync("pdftotext", ["-layout", pdfPath, "-"], {
    maxBuffer: 8_000_000,
    timeout: 20_000,
  })
  return stdout
}

describe("ticketActivationCodesPdfGenerate", () => {
  test("renders metadata once with two columns, stable numbers, and German umlauts", async () => {
    const pdf = await ticketActivationCodesPdfGenerate("Sommerfest Müller-Straße Grüße", "Abendticket Ü", [
      { code: "Z8K4M2PQ", number: 8 },
      { code: "A1B2C3D4", number: 9 },
    ])

    expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe("%PDF-")
    const text = await ticketActivationCodesPdfTextGet(pdf)

    expect(text).toContain("Sommerfest Müller-Straße Grüße")
    expect(text).toContain("Abendticket Ü")
    expect(text).toContain("Nummer")
    expect(text).toContain("Code")
    expect(text.indexOf("8") + text.indexOf("Z8K4M2PQ")).toBeGreaterThan(-1)
    expect(text.indexOf("Z8K4M2PQ")).toBeLessThan(text.indexOf("A1B2C3D4"))
    // Supplied numbers stay stable instead of restarting at 1/2.
    expect(text).not.toMatch(/^\s*1\s+A1B2C3D4/im)
    // Metadata appears exactly once, not repeated per code.
    expect(text.match(/Sommerfest Müller-Straße Grüße/g)?.length).toBe(1)
  })

  test("paginates long lists without repeating metadata", async () => {
    const codes = Array.from({ length: 120 }, (_, index) => ({
      code: `CODE${String(index + 1).padStart(4, "0")}`,
      number: 100 + index,
    }))
    const pdf = await ticketActivationCodesPdfGenerate("Riesenfest", "Tagespass", codes)
    const text = await ticketActivationCodesPdfTextGet(pdf)

    expect(text).toContain("\f")
    expect(text.match(/Riesenfest/g)?.length).toBe(1)
    expect(text.match(/Tagespass/g)?.length).toBe(1)
    expect(text).toContain("CODE0001")
    expect(text).toContain("CODE0120")
    expect(text).toContain("100")
    expect(text).toContain("219")
  })

  test("renders headers with an empty code list", async () => {
    const pdf = await ticketActivationCodesPdfGenerate("Sommerfest", "Abendticket", [])
    const text = await ticketActivationCodesPdfTextGet(pdf)

    expect(text).toContain("Sommerfest")
    expect(text).toContain("Nummer")
    expect(text).toContain("Code")
  })
})
