import { expect, test } from "bun:test"
import type { ContentIssue } from "../src/app/content/ContentIssue.ts"
import { contentBodyCheck } from "../src/app/content/contentBodyCheck.ts"

const filler = (words: number) => Array.from({ length: words }, (_, index) => `wort${index}`).join(" ")
const linkTargets = { existing: new Set<string>(), planned: new Set(["/ratgeber/abiball-kosten"]) }

function germanBody(overrides: { eventorenHeading?: string; extra?: string; faqCount?: number } = {}): string {
  const faq = Array.from(
    { length: overrides.faqCount ?? 4 },
    (_, i) => `### Frage ${i + 1}?\n\nAntwort ${i + 1}.\n`,
  ).join("\n")
  return `Einleitung.

> **Das Wichtigste in Kürze**
>
> - eins
> - zwei
> - drei
> - vier

## Eins

${filler(1900)}

- [ ] Punkt

[Start](/) [Kontakt](/kontakt) [Ratgeber](/ratgeber)

## Zwei

Text.

## ${overrides.eventorenHeading ?? "So setzt du das mit Eventoren um"}

${filler(130)}

## Häufige Fragen

${faq}

## Quellen

- [A](https://a.example/)
- [B](https://b.example/)
- [C](https://c.example/)

${overrides.extra ?? ""}
`
}

const errors = (issues: ContentIssue[]) =>
  issues.filter((issue) => issue.level === "error").map((issue) => issue.message)

test("a body following the article format has no errors", () => {
  expect(errors(contentBodyCheck(germanBody(), { collection: "ratgeber", category: "abiball", linkTargets }))).toEqual(
    [],
  )
})

test("flags H1 headings, raw HTML, too few FAQ questions and forbidden links as errors", () => {
  const issues = contentBodyCheck(
    germanBody({ faqCount: 3, extra: "# Titel\n\n<div>x</div>\n\n[x](/demo/ratgeber)" }),
    {
      collection: "ratgeber",
      category: "abiball",
      linkTargets,
    },
  )
  const messages = errors(issues).join("\n")
  expect(messages).toContain("H1")
  expect(messages).toContain("raw HTML")
  expect(messages).toContain("FAQ has 3 questions")
  expect(messages).toContain("forbidden path: /demo/ratgeber")
})

test("requires the Eventoren section, but accepts the ticket-buyer note for buyer articles", () => {
  const body = germanBody({ eventorenHeading: "Tickets bei Eventoren" })
  expect(errors(contentBodyCheck(body, { collection: "ratgeber", category: "abiball", linkTargets })).join()).toContain(
    "So setzt du das mit Eventoren um",
  )
  expect(errors(contentBodyCheck(body, { collection: "ratgeber", category: "ticketkaeufer", linkTargets }))).toEqual([])
})

test("treats too few words as an error and below-target length as a warning", () => {
  const short = germanBody().replace(filler(1900), filler(1100))
  expect(
    errors(contentBodyCheck(short, { collection: "ratgeber", category: "abiball", linkTargets })).join(),
  ).toContain("min 1500")
  const belowTarget = germanBody().replace(filler(1900), filler(1500))
  const issues = contentBodyCheck(belowTarget, { collection: "ratgeber", category: "abiball", linkTargets })
  expect(errors(issues)).toEqual([])
  expect(issues.some((issue) => issue.level === "warning" && issue.message.includes("target ≥ 1800"))).toBe(true)
})

test("allows body images with a resolvable kebab key and non-empty alt text", () => {
  const body = germanBody({ extra: "![Abendkasse im Abendlicht](ratgeber-abendkasse-organisieren)\n" })
  expect(errors(contentBodyCheck(body, { collection: "ratgeber", category: "abiball", linkTargets }))).toEqual([])
})

test("rejects external URLs, empty alt text and unknown keys in body images", () => {
  const check = (extra: string) =>
    errors(contentBodyCheck(germanBody({ extra }), { collection: "ratgeber", category: "abiball", linkTargets })).join(
      "\n",
    )
  expect(check("![Foto](https://example.com/foto.png)\n")).toContain("kebab-case catalog image key")
  expect(check("![](ratgeber-abendkasse-organisieren)\n")).toContain("non-empty alt text")
  expect(check("![Foto](no-such-image-key)\n")).toContain("unknown image key")
})

test("requires at least five ## sections, the takeaways box and three https sources", () => {
  const issues = contentBodyCheck("## Eins\n\nText.\n\n## Quellen\n\n- [A](https://a.example/)\n", {
    collection: "guides",
    category: "law-tax",
    linkTargets,
  })
  const messages = errors(issues).join("\n")
  expect(messages).toContain("2 ## sections, min 5")
  expect(messages).toContain("Key takeaways")
  expect(messages).toContain('missing "## Sources"')
  expect(messages).toContain('missing "## Frequently asked questions"')
  expect(messages).toContain("How to do this with Eventoren")
})
