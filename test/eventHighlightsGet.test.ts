import { expect, test } from "bun:test"
import { eventHighlightsGet } from "../src/events/eventHighlightsGet.ts"

test("uses edited highlight titles and descriptions instead of legacy tags", () => {
  const highlights = [{ title: "Live-Musik", description: "Zwei Bands auf der Bühne." }]
  expect(eventHighlightsGet({ highlights, tags: ["Rock"] })).toEqual(highlights)
  expect(eventHighlightsGet({ highlights: [], tags: ["Rock"] })).toEqual([])
})

test("shows existing event tags as highlights until they are edited", () => {
  const highlights = eventHighlightsGet({ tags: ["Ein besonderes Highlight"] })
  expect(highlights).toHaveLength(1)
  expect(highlights[0]?.title).toBe("Ein besonderes Highlight")
})
