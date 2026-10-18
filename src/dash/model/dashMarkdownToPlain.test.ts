import { expect, test } from "bun:test"

import { dashMarkdownToPlain } from "./dashMarkdownToPlain.ts"

test("entfernt Fett-, Kursiv- und Link-Markup", () => {
  expect(dashMarkdownToPlain("Hallo **Welt** und [Link](https://example.de)")).toBe("Hallo Welt und Link")
})

test("verbindet Absätze, Überschriften und Listen mit Leerzeichen", () => {
  expect(dashMarkdownToPlain("## Titel\n\nText\n\n- eins\n- zwei")).toBe("Titel Text eins zwei")
})

test("kollabiert mehrfache Leerzeichen und Umbrüche", () => {
  expect(dashMarkdownToPlain("Hallo   Welt\nnächste   Zeile")).toBe("Hallo Welt nächste Zeile")
})

test("leerer Text ergibt leeren String", () => {
  expect(dashMarkdownToPlain("")).toBe("")
})
