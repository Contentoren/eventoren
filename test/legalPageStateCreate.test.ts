import { expect, test } from "bun:test"
import { marked } from "marked"
import { createRoot } from "solid-js"
import { legalPageStateCreate } from "../src/marketing/legalPageStateCreate.ts"

test("documents without numbered sections remain unchanged and have no contents links", () => {
  createRoot((dispose) => {
    const source = "<h1>Impressum</h1>\n<h2>Kontakt</h2>\n<p>Kontaktinformationen.</p>"
    const state = legalPageStateCreate({ html: () => source })

    expect(state.html()).toBe(source)
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

    createRoot((dispose) => {
      const state = legalPageStateCreate({ html: () => source })
      expect(state.headings()).toHaveLength(sectionCount)
      expect(state.html().replace(/<h2[^>]*>/gu, "<h2>")).toBe(source)
      for (const heading of state.headings()) {
        expect(state.html()).toContain(`<h2 id="${heading.id}">${heading.html}</h2>`)
      }
      dispose()
    })
  }
})
