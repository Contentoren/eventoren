#!/usr/bin/env bun

import { readdir, readFile } from "node:fs/promises"
import { basename, join, relative } from "node:path"
import type { ContentIssue } from "./app/content/ContentIssue.ts"
import { contentCollectionConfig } from "./app/content/contentCollectionConfig.ts"
import { contentCollectionFromPath } from "./app/content/contentCollectionFromPath.ts"
import { contentIssueReport } from "./app/content/contentIssueReport.ts"
import { contentLinkTargetsPlanned } from "./app/content/contentLinkTargetsPlanned.ts"
import { contentPathCreate } from "./app/content/contentPathCreate.ts"
import { contentSourceCheck } from "./app/content/contentSourceCheck.ts"

// Usage: bun run content:lint -- content/ratgeber/2026-11-06-<slug>.md content/guides/2026-11-06-<slug>.md
// Per-file checks without generated lists. Links to planned but unwritten articles are warnings only.
const files = process.argv.slice(2).filter((arg) => arg !== "--")
if (files.length === 0) {
  console.error("Usage: bun run content:lint -- content/ratgeber/<file>.md [content/guides/<file>.md ...]")
  process.exit(2)
}

const existing = new Set<string>()
for (const config of Object.values(contentCollectionConfig)) {
  const sources = await readdir(join(process.cwd(), config.dir)).catch(() => [] as string[])
  for (const file of sources) {
    const match = /^\d{4}-\d{2}-\d{2}-(.+)\.md$/u.exec(file)
    if (match?.[1] !== undefined) existing.add(contentPathCreate(config.collection, match[1]))
  }
}
const linkTargets = { existing, planned: contentLinkTargetsPlanned() }

const results: { file: string; issues: ContentIssue[] }[] = []
for (const file of files) {
  const display = relative(process.cwd(), file) || file
  const collection = contentCollectionFromPath(display)
  if (collection === undefined) {
    results.push({
      file: display,
      issues: [{ level: "error", message: "file must live in content/ratgeber/ or content/guides/" }],
    })
    continue
  }
  const source = await readFile(file, "utf8").catch(() => undefined)
  if (source === undefined) {
    results.push({ file: display, issues: [{ level: "error", message: "file not found" }] })
    continue
  }
  results.push({
    file: display,
    issues: contentSourceCheck({ fileName: basename(file), source, collection, linkTargets }),
  })
}

const report = contentIssueReport(results)
for (const line of report.lines) console.log(line)
console.log(`${results.length} file(s): ${report.errors} error(s), ${report.warnings} warning(s).`)
if (report.errors > 0) process.exitCode = 1
