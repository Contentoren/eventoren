import { describe, expect, test } from "bun:test"
import { ticketActivationCodesCsvFormat } from "../src/ticketing/ticketActivationCodesCsvFormat.js"

describe("ticketActivationCodesCsvFormat", () => {
  test("formats event and product metadata once, then the ordered two-column code list", () => {
    const csv = ticketActivationCodesCsvFormat("Sommerfest", "Abendticket", [
      { number: 8, code: "Z8K4M2PQ" },
      { number: 9, code: "A1B2C3D4" },
    ])

    expect(csv).toBe("\uFEFFEvent;Sommerfest\r\nProdukt;Abendticket\r\n\r\nNummer;Code\r\n8;Z8K4M2PQ\r\n9;A1B2C3D4")
  })

  test("quotes RFC-style delimiters, quotes, and line breaks", () => {
    const csv = ticketActivationCodesCsvFormat('Fest; "2026"', "Produkt\nA", [{ number: 1, code: 'AB;CD"EF' }])

    expect(csv).toBe('\uFEFFEvent;"Fest; ""2026"""\r\nProdukt;"Produkt\nA"\r\n\r\nNummer;Code\r\n1;"AB;CD""EF"')
  })

  test("prefixes spreadsheet formula markers in metadata and defensively in codes", () => {
    const csv = ticketActivationCodesCsvFormat("=1+1", "\t@SUM(A1)", [
      { number: 1, code: "-SUM(A1)" },
      { number: 2, code: "SAFE1234" },
    ])

    expect(csv).toBe("\uFEFFEvent;'=1+1\r\nProdukt;'\t@SUM(A1)\r\n\r\nNummer;Code\r\n1;'-SUM(A1)\r\n2;SAFE1234")
  })
})
