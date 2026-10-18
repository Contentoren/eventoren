import { expect, test } from "bun:test"

import { dashIbanValidate } from "./dashIbanValidate.ts"

test("akzeptiert eine gültige deutsche IBAN und normalisiert sie", () => {
  const result = dashIbanValidate("de89 3704 0044 0532 0130 00")
  expect(result.success).toBe(true)
  if (!result.success) throw new Error("Ergebnis sollte erfolgreich sein")
  expect(result.data).toBe("DE89370400440532013000")
})

test("lehnt eine IBAN mit falscher Prüfziffer ab", () => {
  const result = dashIbanValidate("DE89370400440532013001")
  expect(result.success).toBe(false)
  if (result.success) throw new Error("Ergebnis sollte fehlschlagen")
  expect(result.errorMessage).toBe("Prüfziffer stimmt nicht")
})

test("meldet zu kurze IBANs", () => {
  const result = dashIbanValidate("DE89 3704")
  expect(result.success).toBe(false)
  if (result.success) throw new Error("Ergebnis sollte fehlschlagen")
  expect(result.errorMessage).toBe("IBAN ist zu kurz")
})

test("prüft die Länderlängen aus der Tabelle", () => {
  expect(dashIbanValidate("AT611904300234573201").success).toBe(true)
  expect(dashIbanValidate("CH9300762011623852957").success).toBe(true)
  expect(dashIbanValidate("NL91ABNA0417164300").success).toBe(true)
  expect(dashIbanValidate("FR1420041010050500013M02606").success).toBe(true)
  expect(dashIbanValidate("IT60X0542811101000000123456").success).toBe(true)
  expect(dashIbanValidate("ES9121000418450200051332").success).toBe(true)
  expect(dashIbanValidate("BE68539007547034").success).toBe(true)
  expect(dashIbanValidate("LU280019400644750000").success).toBe(true)
})

test("meldet zu lange IBANs und unbekannte Länder", () => {
  const tooLong = dashIbanValidate("DE893704004405320130000")
  expect(tooLong.success).toBe(false)
  if (tooLong.success) throw new Error("Ergebnis sollte fehlschlagen")
  expect(tooLong.errorMessage).toBe("IBAN ist zu lang")
  const unknown = dashIbanValidate("XX89370400440532013000")
  expect(unknown.success).toBe(false)
})
