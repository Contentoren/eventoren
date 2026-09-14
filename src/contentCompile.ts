#!/usr/bin/env bun

import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { Renderer, marked } from "marked"
import type { Token } from "marked"
import { allContent } from "./app/content/contentList.js"

const outputPath = join(process.cwd(), "src", "app", "content", "contentHtml.ts")

const entries = await Promise.all(
  allContent.map(async (entry) => {
    const source = await readFile(join(process.cwd(), entry.contentPath), "utf8")
    const markdown = stripFrontmatter(source).trimStart()
    const headings: ContentHeading[] = []
    return [
      entry.contentPath,
      {
        html: marked.parse(markdown, { async: false, renderer: createArticleRenderer(headings) }),
        headings,
        publicPath: publicPathFromContentPath(entry.contentPath),
      },
    ] as const
  }),
)
const compiled = Object.fromEntries(entries)
const output =
  "// Auto-generated from public/ratgeber/*.md by src/contentCompile.ts.\n" +
  "export type ContentHeading = {\n  readonly id: string\n  readonly text: string\n  readonly depth: 1 | 2\n}\n\n" +
  "export type ContentHtml = {\n  readonly html: string\n  readonly headings: readonly ContentHeading[]\n  readonly publicPath: string\n}\n\n" +
  "export const contentHtml: Readonly<Record<string, ContentHtml>> = " +
  JSON.stringify(compiled, null, 2) +
  "\n"

let current: string | undefined
try {
  current = await readFile(outputPath, "utf8")
} catch {
  current = undefined
}
if (current !== output) await writeFile(outputPath, output, "utf8")

type ContentHeading = {
  readonly id: string
  readonly text: string
  readonly depth: 1 | 2
}

function publicPathFromContentPath(contentPath: string): string {
  const normalized = contentPath.replace(/\\/g, "/").replace(/^\.\//u, "")
  return normalized.startsWith("public/") ? "/" + normalized.slice("public/".length) : "/" + normalized
}

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/u, "")
}

function createArticleRenderer(headings: ContentHeading[]): Renderer<string, string> {
  const renderer = new Renderer<string, string>()
  const usedHeadingIds = new Set<string>()

  renderer.heading = ({ tokens, depth }) => {
    const level = Math.min(Math.max(depth, 2), 6)
    const html = marked.Parser.parseInline(tokens)
    if (level !== 1 && level !== 2) return "<h" + level + ">" + html + "</h" + level + ">"

    const text = headingTextFromTokens(tokens) || "Abschnitt"
    const id = uniqueHeadingId(text, usedHeadingIds)
    headings.push({ id, text, depth: level as 1 | 2 })
    return "<h" + level + ' id="' + id + '">' + html + "</h" + level + ">"
  }

  renderer.html = ({ text }) => text.replace(/<h1(?=[\s>])/giu, "<h2").replace(/<\/h1\s*>/giu, "</h2>")

  return renderer
}

function headingTextFromTokens(tokens: Token[]): string {
  return tokens.map(headingTextFromToken).join("").replace(/\s+/gu, " ").trim()
}

function headingTextFromToken(token: Token): string {
  const nestedTokens = "tokens" in token ? token.tokens : undefined
  if (Array.isArray(nestedTokens)) return headingTextFromTokens(nestedTokens)
  return "text" in token && typeof token.text === "string" ? token.text : ""
}

function uniqueHeadingId(text: string, usedHeadingIds: Set<string>): string {
  const baseId = slugifyHeading(text)
  let id = baseId
  let suffix = 2
  while (usedHeadingIds.has(id)) {
    id = baseId + "-" + suffix
    suffix += 1
  }
  usedHeadingIds.add(id)
  return id
}

function slugifyHeading(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/&/g, " und ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
  return slug || "abschnitt"
}
