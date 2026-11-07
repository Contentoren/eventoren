#!/usr/bin/env bun

import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import type { ContentIssue } from "./app/content/ContentIssue.ts"
import { contentCollectionConfig } from "./app/content/contentCollectionConfig.ts"
import type { ContentCollection } from "./app/content/contentCollectionSchema.ts"
import { contentEntryList } from "./app/content/contentEntryList.ts"
import { contentIssueReport } from "./app/content/contentIssueReport.ts"
import { contentSourceCheck } from "./app/content/contentSourceCheck.ts"
import { contentSourceParse } from "./app/content/contentSourceParse.ts"
import { contentTranslationKeyCheck } from "./app/content/contentTranslationKeyCheck.ts"

// Validates content/ratgeber and content/guides after content:process:local regenerated the lists.
// Internal links must point to existing articles here (content:lint only warns for planned ones).
const collections = Object.keys(contentCollectionConfig) as ContentCollection[]
const results: { file: string; issues: ContentIssue[] }[] = []
const globalIssues: ContentIssue[] = []
const translationItems: { collection: ContentCollection; file: string; translationKey: string | null }[] = []
const existing = new Set(collections.flatMap((collection) => contentEntryList(collection).map((entry) => entry.path)))

for (const collection of collections) {
  const config = contentCollectionConfig[collection]
  const files = (await readdir(join(process.cwd(), config.dir))).filter((file) => file.endsWith(".md")).sort()
  const entries = contentEntryList(collection)
  if (entries.length !== files.length)
    globalIssues.push({
      level: "error",
      message: `${collection}: ${files.length} source file(s) but ${entries.length} list entr(ies); run content:process:local`,
    })

  const slugs = new Map<string, string>()
  for (const entry of entries) {
    const issues: ContentIssue[] = []
    if (!entry.path.startsWith(`${config.pathBase}/`))
      issues.push({ level: "error", message: `path must start with ${config.pathBase}/: ${entry.path}` })
    if (entry.contentPath !== `./${config.dir}/${entry.id}.md`)
      issues.push({
        level: "error",
        message: `contentPath must be ./${config.dir}/${entry.id}.md: ${entry.contentPath}`,
      })
    const duplicate = slugs.get(entry.slug)
    if (duplicate !== undefined)
      issues.push({ level: "error", message: `duplicate slug "${entry.slug}" (also ${duplicate})` })
    slugs.set(entry.slug, entry.id)
    if (issues.length > 0) results.push({ file: entry.contentPath, issues })
  }

  for (const file of files) {
    const path = `${config.dir}/${file}`
    const source = await readFile(join(process.cwd(), path), "utf8")
    const issues = contentSourceCheck({
      fileName: file,
      source,
      collection,
      linkTargets: { existing, planned: new Set() },
    })
    results.push({ file: path, issues })
    const parsed = contentSourceParse(source)
    const translationKey = parsed.success ? parsed.data.data.translationKey : undefined
    translationItems.push({
      collection,
      file: path,
      translationKey: typeof translationKey === "string" ? translationKey : null,
    })
  }
}
globalIssues.push(...contentTranslationKeyCheck(translationItems))

const report = contentIssueReport([
  ...results,
  ...(globalIssues.length > 0 ? [{ file: "(collections)", issues: globalIssues }] : []),
])
for (const line of report.lines) console.log(line)
const counts = collections.map((collection) => `${collection}=${contentEntryList(collection).length}`).join(", ")
if (report.errors > 0) {
  console.error(`Content check failed: ${report.errors} error(s), ${report.warnings} warning(s) [${counts}].`)
  process.exitCode = 1
} else {
  console.log(`Content check passed: ${report.warnings} warning(s) [${counts}].`)
}
