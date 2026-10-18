import { expect, test } from "bun:test"

import { dashMarkdownParse } from "./dashMarkdownParse.ts"

test("parst Absätze und wandelt einzelne Zeilenumbrüche in Umbrüche um", () => {
  const blocks = dashMarkdownParse("Erste Zeile\nzweite Zeile\n\nNeuer Absatz")
  expect(blocks).toHaveLength(2)
  expect(blocks[0]).toEqual({
    type: "paragraph",
    inlines: [{ type: "text", text: "Erste Zeile" }, { type: "break" }, { type: "text", text: "zweite Zeile" }],
  })
  expect(blocks[1]).toEqual({ type: "paragraph", inlines: [{ type: "text", text: "Neuer Absatz" }] })
})

test("parst Überschriften mit ## und ### und behandelt # wie Ebene 2", () => {
  const blocks = dashMarkdownParse("## Titel\n\n### Untertitel\n\n# Einfach")
  expect(blocks).toEqual([
    { type: "heading", level: 2, inlines: [{ type: "text", text: "Titel" }] },
    { type: "heading", level: 3, inlines: [{ type: "text", text: "Untertitel" }] },
    { type: "heading", level: 2, inlines: [{ type: "text", text: "Einfach" }] },
  ])
})

test("parst Aufzählungen mit - und *", () => {
  const blocks = dashMarkdownParse("- Apfel\n- Birne\n\n* Kirsche")
  expect(blocks).toHaveLength(2)
  expect(blocks[0]).toEqual({
    type: "list",
    ordered: false,
    items: [[{ type: "text", text: "Apfel" }], [{ type: "text", text: "Birne" }]],
  })
  expect(blocks[1]).toEqual({ type: "list", ordered: false, items: [[{ type: "text", text: "Kirsche" }]] })
})

test("parst nummerierte Listen", () => {
  const blocks = dashMarkdownParse("1. Erster\n2. Zweiter")
  expect(blocks).toEqual([
    {
      type: "list",
      ordered: true,
      items: [[{ type: "text", text: "Erster" }], [{ type: "text", text: "Zweiter" }]],
    },
  ])
})

test("parst Fett- und Kursivschrift", () => {
  const blocks = dashMarkdownParse("Hallo **Welt** und *Kursiv* sowie _auch kursiv_")
  expect(blocks).toEqual([
    {
      type: "paragraph",
      inlines: [
        { type: "text", text: "Hallo " },
        { type: "bold", children: [{ type: "text", text: "Welt" }] },
        { type: "text", text: " und " },
        { type: "italic", children: [{ type: "text", text: "Kursiv" }] },
        { type: "text", text: " sowie " },
        { type: "italic", children: [{ type: "text", text: "auch kursiv" }] },
      ],
    },
  ])
})

test("parst Links mit http, https und mailto", () => {
  const blocks = dashMarkdownParse("[Web](https://example.de) und [Mail](mailto:a@example.de)")
  expect(blocks).toEqual([
    {
      type: "paragraph",
      inlines: [
        { type: "link", href: "https://example.de", children: [{ type: "text", text: "Web" }] },
        { type: "text", text: " und " },
        { type: "link", href: "mailto:a@example.de", children: [{ type: "text", text: "Mail" }] },
      ],
    },
  ])
})

test("lässt nur http-, https- und mailto-Links zu", () => {
  const blocks = dashMarkdownParse("[Böse](javascript:alert(1))")
  expect(blocks).toEqual([{ type: "paragraph", inlines: [{ type: "text", text: "[Böse](javascript:alert(1))" }] }])
})

test("behandelt XSS-Eingaben als reinen Text", () => {
  const blocks = dashMarkdownParse("<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>")
  expect(blocks).toEqual([
    { type: "paragraph", inlines: [{ type: "text", text: "<script>alert(1)</script>" }] },
    { type: "paragraph", inlines: [{ type: "text", text: "<img src=x onerror=alert(1)>" }] },
  ])
})

test("leerer Text ergibt keine Blöcke", () => {
  expect(dashMarkdownParse("")).toEqual([])
  expect(dashMarkdownParse("   \n  ")).toEqual([])
})
