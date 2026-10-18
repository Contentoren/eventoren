import { expect, test } from "bun:test"

import { dashCodeGenerate } from "./dashCodeGenerate.ts"
import { dashRandomCreate } from "./dashRandomCreate.ts"

test("erzeugt die gewünschte Anzahl Codes mit Präfix", () => {
  const codes = dashCodeGenerate({ prefix: "ABI-", count: 3, random: dashRandomCreate(1) })
  expect(codes).toHaveLength(3)
  for (const code of codes) expect(code.startsWith("ABI-")).toBe(true)
})

test("ist bei gleichem Seed deterministisch", () => {
  const first = dashCodeGenerate({ prefix: "ABI-", count: 5, random: dashRandomCreate(42) })
  const second = dashCodeGenerate({ prefix: "ABI-", count: 5, random: dashRandomCreate(42) })
  expect(first).toEqual(second)
})

test("nutzt nur unverwechselbare Zeichen", () => {
  const codes = dashCodeGenerate({ count: 20, length: 8, random: dashRandomCreate(9) })
  for (const code of codes) expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/u)
})

test("vermeidet Duplikate untereinander und gegen bestehende Codes", () => {
  const codes = dashCodeGenerate({ count: 50, length: 4, existing: ["AAAAAA", "BBBBBB"], random: dashRandomCreate(3) })
  expect(new Set(codes).size).toBe(codes.length)
  expect(codes).not.toContain("AAAAAA")
  expect(codes).not.toContain("BBBBBB")
})

test("normalisiert das Präfix auf Großbuchstaben ohne Sonderzeichen", () => {
  const codes = dashCodeGenerate({ prefix: "abi_12! ", count: 2, random: dashRandomCreate(5) })
  for (const code of codes) expect(code.startsWith("ABI12")).toBe(true)
})
