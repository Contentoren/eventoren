import { expect, test } from "bun:test"
import { contentReadingMinutes } from "../src/app/content/contentReadingMinutes.ts"
import { contentWordCount } from "../src/app/content/contentWordCount.ts"

test("reading time is words / 200 rounded up with a minimum of one minute", () => {
  expect(contentReadingMinutes(0)).toBe(1)
  expect(contentReadingMinutes(200)).toBe(1)
  expect(contentReadingMinutes(201)).toBe(2)
  expect(contentReadingMinutes(1800)).toBe(9)
})

test("word count ignores Markdown syntax, link targets and bare URLs", () => {
  const markdown =
    "## Zwei Wörter\n\n- [Ein Link](https://example.org/a-b-c) und https://example.org\n\n| a | b |\n|---|---|"
  // Zwei, Wörter, Ein, Link, und, a, b
  expect(contentWordCount(markdown)).toBe(7)
})
