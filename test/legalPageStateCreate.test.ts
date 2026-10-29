import { expect, test } from "bun:test"
import { marked } from "marked"
import { createRoot } from "solid-js"
import { legalPageStateCreate } from "../src/marketing/legalPageStateCreate.ts"

test("a leading content h1 is removed because the page renders its own h1 from the title", () => {
  createRoot((dispose) => {
    const source = "<h1>Impressum</h1>\n<h2>Kontakt</h2>\n<p>Kontaktinformationen.</p>"
    const state = legalPageStateCreate({ html: () => source })

    expect(state.html()).toBe("\n<h2>Kontakt</h2>\n<p>Kontaktinformationen.</p>")
    expect(state.headings()).toEqual([])
    dispose()
  })
})

test("the AGB and Datenschutz Markdown documents retain all text and link to every numbered section", async () => {
  for (const [name, sectionCount] of [
    ["agb", 11],
    ["datenschutz", 8],
  ] as const) {
    const markdown = await Bun.file(new URL(`../src/legal/${name}.md`, import.meta.url)).text()
    const source = marked.parse(markdown.replace(/^---\n[\s\S]*?\n---\n/u, "").trim(), { async: false })
    const withoutLeadingH1 = source.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, "")

    createRoot((dispose) => {
      const state = legalPageStateCreate({ html: () => source })
      expect(state.headings()).toHaveLength(sectionCount)
      expect(state.html().replace(/<h2[^>]*>/gu, "<h2>")).toBe(withoutLeadingH1)
      for (const heading of state.headings()) {
        expect(state.html()).toContain(`<h2 id="${heading.id}">${heading.html}</h2>`)
      }
      dispose()
    })
  }
})
