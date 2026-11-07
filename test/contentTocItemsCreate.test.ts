import { expect, test } from "bun:test"
import { contentTocItemsCreate } from "../src/app/content/contentTocItemsCreate.ts"

test("TOC lists only ## sections in order and links to their heading ids", () => {
  expect(
    contentTocItemsCreate([
      { id: "vorbereitung", text: "Vorbereitung", depth: 2 },
      { id: "intro", text: "Intro", depth: 1 },
      { id: "haeufige-fragen", text: "Häufige Fragen", depth: 2 },
    ]),
  ).toEqual([
    { id: "vorbereitung", text: "Vorbereitung", href: "#vorbereitung" },
    { id: "haeufige-fragen", text: "Häufige Fragen", href: "#haeufige-fragen" },
  ])
})

test("TOC is empty when the article has no sections", () => {
  expect(contentTocItemsCreate([])).toEqual([])
})
