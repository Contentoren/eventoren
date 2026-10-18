import { expect, test } from "bun:test"
import { dashCsvCreate } from "./dashCsvCreate.ts"

test("beginnt mit BOM und nutzt Semikolon und CRLF", () => {
  const csv = dashCsvCreate(["Name", "Betrag"], [["Lea", 12.5]])
  expect(csv.startsWith("﻿")).toBe(true)
  expect(csv).toBe("﻿Name;Betrag\r\nLea;12,5\r\n")
})

test("formatiert Dezimalzahlen mit Komma und null als leer", () => {
  const csv = dashCsvCreate(["a", "b", "c"], [[1.99, 42, null]])
  expect(csv).toContain("1,99;42;\r\n")
})

test("quotet bei Semikolon, Anführungszeichen und Umbrüchen", () => {
  const csv = dashCsvCreate(["h"], [["a;b"], ['sag "hi"'], ["zeile1\nzeile2"], [" vorne"], ["hinten "]])
  expect(csv).toContain('"a;b"')
  expect(csv).toContain('"sag ""hi"""')
  expect(csv).toContain('"zeile1\nzeile2"')
  expect(csv).toContain('" vorne"')
  expect(csv).toContain('"hinten "')
})

test("schützt vor CSV-Injection mit führendem Apostroph", () => {
  const csv = dashCsvCreate(["h"], [["=SUMME(A1)"], ["+cmd"], ["-2"], ["@x"], ["\tTabbed"]])
  expect(csv).toContain("'=SUMME(A1)")
  expect(csv).toContain("'+cmd")
  expect(csv).toContain("'-2")
  expect(csv).toContain("'@x")
  expect(csv).toContain("'\tTabbed")
})
