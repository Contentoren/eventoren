import { afterEach, expect, test } from "bun:test"
import { ticketActivationCodeCreate } from "../src/ticketing/convex/ticketActivationCodeCreate.ts"

const originalGetRandomValues = crypto.getRandomValues.bind(crypto)

afterEach(() => {
  crypto.getRandomValues = originalGetRandomValues
})

function mockCryptoBytes(values: readonly number[]): void {
  let cursor = 0
  crypto.getRandomValues = ((array: Uint8Array): Uint8Array => {
    for (let index = 0; index < array.length; index += 1) {
      array[index] = values[cursor % values.length] ?? 0
      cursor += 1
    }
    return array
  }) as typeof crypto.getRandomValues
}

function codeConstraintsSatisfied(code: string): boolean {
  return code.length === 8 && /^[A-Z0-9]{8}$/.test(code) && /^[A-Z]/.test(code) && /\d/.test(code)
}

test("all-letter mocked entropy still yields a letter-first code with a digit without looping", () => {
  mockCryptoBytes([0])
  const code = ticketActivationCodeCreate()
  expect(code).toBe("A0AAAAAA")
  expect(codeConstraintsSatisfied(code)).toBe(true)
})

test("edge mocked entropy keeps length, charset, letter-first and digit constraints", () => {
  mockCryptoBytes([25, 9, 35, 3, 7, 15, 2, 8, 12])
  const code = ticketActivationCodeCreate()
  expect(code.length).toBe(8)
  expect(code).toMatch(/^[A-Z0-9]{8}$/)
  expect(code[0]).toMatch(/^[A-Z]$/)
  expect(code).toMatch(/\d/)
})

test("changing mocked inputs produce variation", () => {
  mockCryptoBytes([0])
  const first = ticketActivationCodeCreate()
  mockCryptoBytes([1])
  const second = ticketActivationCodeCreate()
  expect(first).not.toBe(second)
  expect(codeConstraintsSatisfied(first)).toBe(true)
  expect(codeConstraintsSatisfied(second)).toBe(true)
})

test("live entropy keeps length, charset, letter-first and digit constraints", () => {
  crypto.getRandomValues = originalGetRandomValues
  for (let index = 0; index < 50; index += 1) {
    expect(codeConstraintsSatisfied(ticketActivationCodeCreate())).toBe(true)
  }
})
