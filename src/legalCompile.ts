#!/usr/bin/env bun

import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { marked } from "marked"

const legalPages = [
  { key: "impressum", sourcePath: "src/legal/impressum.md" },
  { key: "datenschutz", sourcePath: "src/legal/datenschutz.md" },
  { key: "terms", sourcePath: "src/legal/terms.md" },
  { key: "privacy", sourcePath: "src/legal/privacy.md" },
] as const
const outputPath = join(process.cwd(), "src", "lib", "legalHtml.ts")

const entries = await Promise.all(
  legalPages.map(async (page) => {
    const source = await readFile(join(process.cwd(), page.sourcePath), "utf8")
    const markdown = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/u, "").trimStart()
    return [page.key, marked.parse(markdown, { async: false })] as const
  }),
)
const html = Object.fromEntries(entries)
function serializeString(value: string): string {
  const doubleQuoteCount = value.split('"').length - 1
  const apostropheCount = value.split("'").length - 1
  if (doubleQuoteCount === 0 || doubleQuoteCount < apostropheCount) return JSON.stringify(value)
  return (
    "'" +
    value
      .replaceAll("\\", "\\\\")
      .replaceAll("'", "\\'")
      .replaceAll("\n", "\\n")
      .replaceAll("\r", "\\r")
      .replaceAll("\t", "\\t")
      .replaceAll("\b", "\\b")
      .replaceAll("\f", "\\f") +
    "'"
  )
}
const htmlEntries = Object.entries(html)
  .map(([key, value]) => {
    const serialized = serializeString(value)
    const inline = `  ${key}: ${serialized},`
    return inline.length <= 120 ? inline : `  ${key}:\n    ${serialized},`
  })
  .join("\n")
const output = `// Auto-generated from src/legal/*.md by src/legalCompile.ts.\nexport const legalHtml = {\n${htmlEntries}\n} as const\n`

let current: string | undefined
try {
  current = await readFile(outputPath, "utf8")
} catch {
  current = undefined
}
if (current !== output) await writeFile(outputPath, output, "utf8")
