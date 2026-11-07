import { expect, test } from "bun:test"
import { contentFaqExtract } from "../src/app/content/contentFaqExtract.ts"
import { contentMarkdownLex } from "../src/app/content/contentMarkdownLex.ts"

const markdown = `## Intro

### Not a FAQ?

Text outside the FAQ section.

## Häufige Fragen

### Was kostet das?

Erster Absatz mit **Fett**.

Zweiter Absatz mit [Quelle](https://example.org).

### Brauche ich eine App?

Nein.

#### Detail

Ignored detail.

## Quellen

- https://example.org
`

test("collects each ### question with its following paragraphs from the German FAQ section only", () => {
  const faq = contentFaqExtract(contentMarkdownLex(markdown))
  expect(faq.map((item) => item.question)).toEqual(["Was kostet das?", "Brauche ich eine App?"])
  expect(faq[0]?.answerText).toBe("Erster Absatz mit Fett. Zweiter Absatz mit Quelle.")
  expect(faq[0]?.answerHtml).toContain("<strong>Fett</strong>")
  expect(faq[0]?.answerHtml).toContain('<a rel="noopener" target="_blank" href="https://example.org">')
  expect(faq[1]?.answerText).toBe("Nein.")
})

test("recognises the English FAQ heading", () => {
  const faq = contentFaqExtract(contentMarkdownLex("## Frequently asked questions\n\n### Is it free?\n\nYes.\n"))
  expect(faq).toEqual([{ question: "Is it free?", answerHtml: "<p>Yes.</p>", answerText: "Yes." }])
})

test("returns no items when the article has no FAQ section", () => {
  expect(contentFaqExtract(contentMarkdownLex("## Intro\n\n### Question?\n\nAnswer.\n"))).toEqual([])
})
