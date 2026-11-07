import { expect, test } from "bun:test"
import { contentFrontmatterCheck } from "../src/app/content/contentFrontmatterCheck.ts"

const valid = {
  title: "Abiball-Kosten 2026/2027: Kalkulation pro Person mit Beispiel",
  description:
    "Was kostet ein Abiball 2026/2027 pro Person? Kalkulation mit Location, Catering, DJ und Tickets, plus Beispielrechnung und Spartipps.",
  publishedAt: "2026-11-06",
  slug: "abiball-kosten",
  author: "Eventoren Redaktion",
  image: "ratgeber-abiball-kosten",
  imageAlt: "Abiturientinnen planen am Tisch die Kosten für ihren Abiball",
  category: "abiball",
  keywords: ["abiball kosten", "abiball kosten pro person", "abiball tickets preis", "abiball budget"],
}

const errors = (
  data: Record<string, unknown>,
  collection: "ratgeber" | "guides" = "ratgeber",
  slug = "abiball-kosten",
) =>
  contentFrontmatterCheck(data, collection, slug)
    .filter((issue) => issue.level === "error")
    .map((issue) => issue.message)

test("accepts frontmatter that follows the plan", () => {
  expect(errors(valid)).toEqual([])
})

test("rejects a category from the other collection and keyword lists outside 4–10", () => {
  expect(errors({ ...valid, category: "law-tax" }).join()).toContain('category "law-tax"')
  expect(errors({ ...valid, keywords: ["a", "b", "c"] }).join()).toContain("keywords has 3 entries")
})

test("enforces title, seoTitle and description lengths", () => {
  expect(errors({ ...valid, title: "x".repeat(81) }).join()).toContain("title has 81 chars")
  expect(errors({ ...valid, seoTitle: "x".repeat(61) }).join()).toContain("seoTitle has 61 chars")
  expect(errors({ ...valid, description: "zu kurz" }).join()).toContain("description has 7 chars")
})

test("requires image, imageAlt, author and a slug matching the filename", () => {
  const { image: _image, imageAlt: _alt, author: _author, ...rest } = valid
  const messages = errors(rest).join("\n")
  for (const key of ["image", "imageAlt", "author"]) expect(messages).toContain(`${key} is required`)
  expect(errors(valid, "ratgeber", "anderer-slug").join()).toContain("does not match the filename slug")
})
