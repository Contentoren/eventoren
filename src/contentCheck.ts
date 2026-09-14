import { readdir } from "node:fs/promises"
import { join } from "node:path"
import { allContent, isPublishedAtBuild, publishedContent } from "./app/content/contentList.js"

const contentDirectory = join(process.cwd(), "public", "ratgeber")
const buildDate = new Date().toISOString().slice(0, 10)
const files = (await readdir(contentDirectory)).filter((file) => file.endsWith(".md")).sort()
const failures: string[] = []

for (const file of files) {
  if (!/^\d{4}-\d{2}-\d{2}-.+\.md$/u.test(file)) failures.push("invalid content filename: " + file)
}
for (const entry of allContent) {
  if (!entry.path.startsWith("/ratgeber/")) failures.push("invalid article path: " + entry.path)
  if (entry.contentPath !== "./public/ratgeber/" + entry.id + ".md")
    failures.push("invalid content path: " + entry.contentPath)
  if (isPublishedAtBuild(entry, buildDate) !== entry.publishedAt <= buildDate)
    failures.push("non-deterministic publication status: " + entry.slug)
}
if (publishedContent(buildDate).some((entry) => entry.publishedAt > buildDate))
  failures.push("future content was included in publishedContent")

if (failures.length > 0) {
  console.error("Content source verification failed:\n" + failures.map((failure) => "- " + failure).join("\n"))
  process.exitCode = 1
} else {
  console.log(
    `Verified ${allContent.length} content catalog entr${allContent.length === 1 ? "y" : "ies"} and publication cutoff ${buildDate}.`,
  )
}
