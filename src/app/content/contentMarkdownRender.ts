import { Parser } from "marked"
import type { ContentFaqItem } from "./ContentFaqItem.ts"
import type { ContentHeading } from "./ContentHeading.ts"
import { contentFaqExtract } from "./contentFaqExtract.ts"
import { contentMarkdownLex } from "./contentMarkdownLex.ts"
import { contentMarkedRendererCreate } from "./contentMarkedRendererCreate.ts"
import { contentReadingMinutes } from "./contentReadingMinutes.ts"
import { contentWordCount } from "./contentWordCount.ts"

export type ContentMarkdownRendered = {
  readonly html: string
  readonly headings: readonly ContentHeading[]
  readonly faq: readonly ContentFaqItem[]
  readonly wordCount: number
  readonly readingMinutes: number
}

/** Render an article body (frontmatter already removed) to HTML, TOC headings, FAQ and reading time. */
export function contentMarkdownRender(markdown: string, lang: "de" | "en" = "de"): ContentMarkdownRendered {
  const tokens = contentMarkdownLex(markdown)
  const headings: ContentHeading[] = []
  const html = Parser.parse(tokens, { renderer: contentMarkedRendererCreate(headings, lang) })
  const wordCount = contentWordCount(markdown)
  return { html, headings, faq: contentFaqExtract(tokens), wordCount, readingMinutes: contentReadingMinutes(wordCount) }
}
