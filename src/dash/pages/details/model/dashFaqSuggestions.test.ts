import { expect, test } from "bun:test"

import { dashFaqSuggestions } from "./dashFaqSuggestions.ts"

test("dashFaqSuggestions liefert fünf Vorschläge mit eindeutigen Fragen", () => {
  const suggestions = dashFaqSuggestions()
  expect(suggestions).toHaveLength(5)
  expect(new Set(suggestions.map((suggestion) => suggestion.question)).size).toBe(5)
  expect(new Set(suggestions.map((suggestion) => suggestion.label)).size).toBe(5)
  expect(suggestions.every((suggestion) => suggestion.answer.trim().length > 0)).toBe(true)
})

test("dashFaqSuggestions startet mit Parken in du-Form", () => {
  const first = dashFaqSuggestions()[0]
  expect(first?.label).toBe("Parken")
  expect(first?.question).toBe("Gibt es Parkplätze?")
  expect(first?.answer.startsWith("Ja, direkt am Haus")).toBe(true)
})
