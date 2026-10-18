import { expect, test } from "bun:test"
import {
  commandPaletteFilterGroups,
  commandPaletteGroupsFlatten,
  commandPaletteItemScore,
  type CommandPaletteFlatItem,
} from "./commandPaletteFilter.ts"

const flat: CommandPaletteFlatItem[] = commandPaletteGroupsFlatten([
  {
    id: "seiten",
    label: "Seiten",
    items: [
      { id: "uebersicht", label: "Übersicht", keywords: ["Dashboard"] },
      { id: "events", label: "Events", description: "Alle Veranstaltungen" },
    ],
  },
  {
    id: "events",
    label: "Events",
    items: [{ id: "jazz", label: "Jazz & Wein", keywords: ["Konzert"] }],
  },
])

test("empty query returns all items in group order", () => {
  const ranked = commandPaletteFilterGroups(flat, "")
  expect(ranked.map((item) => item.id)).toEqual(["seiten:uebersicht", "seiten:events", "events:jazz"])
})

test("matching is case- and diacritic-insensitive", () => {
  const ranked = commandPaletteFilterGroups(flat, "ubersicht")
  expect(ranked.map((item) => item.id)).toEqual(["seiten:uebersicht"])
  expect(commandPaletteItemScore(flat[0]!, "ÜBERSICHT")).toBe(3)
})

test("prefix matches rank before substring matches", () => {
  const ranked = commandPaletteFilterGroups(flat, "eve")
  expect(ranked[0]!.id).toBe("seiten:events")
})

test("description and keywords match, unrelated query is empty", () => {
  expect(commandPaletteFilterGroups(flat, "veranstaltung").map((item) => item.id)).toEqual(["seiten:events"])
  expect(commandPaletteFilterGroups(flat, "konzert").map((item) => item.id)).toEqual(["events:jazz"])
  expect(commandPaletteFilterGroups(flat, "zzz")).toEqual([])
})

test("word prefix scores above substring", () => {
  expect(commandPaletteItemScore(flat[2]!, "wein")).toBe(2)
  expect(commandPaletteItemScore(flat[1]!, "alle")).toBe(1)
})
