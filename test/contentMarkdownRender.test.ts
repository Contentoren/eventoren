import { expect, test } from "bun:test"
import { contentMarkdownRender } from "../src/app/content/contentMarkdownRender.ts"

test("clamps h1 to h2 and gives each h2 a unique German slug id for the table of contents", () => {
  const rendered = contentMarkdownRender("# Größe & Übersicht\n\n## Größe & Übersicht\n\n### Sub\n")
  expect(rendered.headings).toEqual([
    { id: "groesse-und-uebersicht", text: "Größe & Übersicht", depth: 2 },
    { id: "groesse-und-uebersicht-2", text: "Größe & Übersicht", depth: 2 },
  ])
  expect(rendered.html).not.toContain("<h1")
  expect(rendered.html).toContain("<h3>Sub</h3>")
})

test("uses 'and' for ampersands in English heading ids", () => {
  expect(contentMarkdownRender("## Law & tax\n", "en").headings[0]?.id).toBe("law-and-tax")
})

test("opens external links in a new tab but keeps eventoren.de and relative links in place", () => {
  const { html } = contentMarkdownRender(
    "[a](https://www.gema.de/) [b](https://eventoren.de/kontakt) [c](/ratgeber) [d](mailto:x@y.de)",
  )
  expect(html).toContain('<a rel="noopener" target="_blank" href="https://www.gema.de/">a</a>')
  expect(html).toContain('<a href="https://eventoren.de/kontakt">b</a>')
  expect(html).toContain('<a href="/ratgeber">c</a>')
  expect(html).toContain('<a href="mailto:x@y.de">d</a>')
})

test("wraps tables in a horizontal scroll container", () => {
  const { html } = contentMarkdownRender("| a | b |\n|---|---|\n| 1 | 2 |\n")
  expect(html.startsWith('<div class="table-scroll">\n<table>')).toBe(true)
  expect(html.trim().endsWith("</table>\n</div>")).toBe(true)
})

test("renders task-list items with a disabled checkbox and no id attributes", () => {
  const { html } = contentMarkdownRender("- [ ] offen\n- [x] erledigt\n")
  expect(html).toContain('<ul class="task-list">')
  expect(html).toContain('<li class="task-list-item"><input type="checkbox" disabled> offen</li>')
  expect(html).toContain('<li class="task-list-item"><input type="checkbox" disabled checked> erledigt</li>')
  expect(html).not.toContain("id=")
})

test("renders body images as lazy, dimensioned catalog images", () => {
  const { html } = contentMarkdownRender("![Abendkasse im warmen Licht](ratgeber-abendkasse-organisieren)")
  expect(html).toContain('alt="Abendkasse im warmen Licht"')
  expect(html).toContain('width="1920"')
  expect(html).toContain('height="1080"')
  expect(html).toContain('loading="lazy"')
  expect(html).toContain('decoding="async"')
  expect(html).toMatch(/ratgeber-abendkasse-organisieren_default_v\d+\.avif/u)
})

test("throws at compile time for unresolvable image keys", () => {
  expect(() => contentMarkdownRender("![Alt](no-such-image-key)")).toThrow("unknown image key")
})

test("reports word count and reading minutes", () => {
  const rendered = contentMarkdownRender(Array.from({ length: 401 }, () => "Wort").join(" "))
  expect(rendered.wordCount).toBe(401)
  expect(rendered.readingMinutes).toBe(3)
})
