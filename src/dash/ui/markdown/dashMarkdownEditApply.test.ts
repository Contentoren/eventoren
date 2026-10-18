import { expect, test } from "bun:test"

import {
  dashMarkdownEditToggleHeading,
  dashMarkdownEditToggleList,
  dashMarkdownEditWrapBold,
  dashMarkdownEditWrapItalic,
  dashMarkdownEditWrapLink,
} from "#src/dash/ui/markdown/dashMarkdownEditApply.ts"

test("fettet die Auswahl ein und legt den Cursor in die Mitte bei leerer Auswahl", () => {
  expect(dashMarkdownEditWrapBold({ value: "Hallo Welt", start: 6, end: 10 })).toEqual({
    value: "Hallo **Welt**",
    start: 14,
    end: 14,
  })
  expect(dashMarkdownEditWrapBold({ value: "Hallo ", start: 6, end: 6 })).toEqual({
    value: "Hallo ****",
    start: 8,
    end: 8,
  })
})

test("stellt kursiv mit einem Stern dar", () => {
  expect(dashMarkdownEditWrapItalic({ value: "Hallo Welt", start: 0, end: 5 })).toEqual({
    value: "*Hallo* Welt",
    start: 7,
    end: 7,
  })
  expect(dashMarkdownEditWrapItalic({ value: "", start: 0, end: 0 }).value).toBe("**")
})

test("setzt die Überschrift vor die aktuelle Zeile und entfernt sie wieder", () => {
  const added = dashMarkdownEditToggleHeading({ value: "Titel\nText", start: 0, end: 0 })
  expect(added.value).toBe("## Titel\nText")
  expect(dashMarkdownEditToggleHeading({ value: added.value, start: 3, end: 3 }).value).toBe("Titel\nText")
})

test("stellt Listen mit Bindestrich voran und entfernt sie wieder", () => {
  const added = dashMarkdownEditToggleList({ value: "Apfel\nBirne", start: 0, end: 11 })
  expect(added.value).toBe("- Apfel\n- Birne")
  expect(dashMarkdownEditToggleList({ value: added.value, start: 0, end: added.value.length }).value).toBe(
    "Apfel\nBirne",
  )
})

test("entfernt nummerierte Listenzeichen ebenfalls", () => {
  expect(dashMarkdownEditToggleList({ value: "1. Erster\n2. Zweiter", start: 0, end: 19 }).value).toBe(
    "Erster\nZweiter",
  )
})

test("wickelt die Auswahl in einen Link mit https-Platzhalter", () => {
  const result = dashMarkdownEditWrapLink({ value: "Webseite", start: 0, end: 8 })
  expect(result.value).toBe("[Webseite](https://)")
  expect(result.value.slice(result.start, result.start + 8)).toBe("https://")
})
