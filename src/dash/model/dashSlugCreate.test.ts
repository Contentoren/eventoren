import { expect, test } from "bun:test"
import { dashSlugCreate } from "./dashSlugCreate.ts"

test("wandelt Titel mit Sonderzeichen in Slugs um", () => {
  expect(dashSlugCreate("Jazz & Wein")).toBe("jazz-wein")
  expect(dashSlugCreate("Straßenfest Über Köln")).toBe("strassenfest-ueber-koeln")
})

test("ersetzt Umlaute und entfernt diakritische Zeichen", () => {
  expect(dashSlugCreate("Äpfel Öl Übung")).toBe("aepfel-oel-uebung")
  expect(dashSlugCreate("Café Münchner")).toBe("cafe-muenchner")
  expect(dashSlugCreate("Größe")).toBe("groesse")
})

test("kollabiert Trennzeichen und entfernt Ränder", () => {
  expect(dashSlugCreate("  Hallo -- Welt!! ")).toBe("hallo-welt")
  expect(dashSlugCreate("a---b")).toBe("a-b")
})

test("kürzt auf maxLength ohne Bindestrich am Ende", () => {
  expect(dashSlugCreate("abcdefghij", 5)).toBe("abcde")
  expect(dashSlugCreate("abcde-fghij", 6)).toBe("abcde")
})

test("leerer Text ergibt leeren Slug", () => {
  expect(dashSlugCreate("")).toBe("")
  expect(dashSlugCreate("!!!")).toBe("")
})
