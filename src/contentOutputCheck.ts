import { access, readFile } from "node:fs/promises"
import { join } from "node:path"
import { allContent, isPublishedAtBuild } from "./app/content/contentList.js"

const distClient = join(process.cwd(), "dist", "client")
const siteUrl = "https://eventoren.contentoren.de"
const buildDate = new Date().toISOString().slice(0, 10)
const failures: string[] = []
const sitemap = await readOutput("sitemap.xml")

async function readOutput(path: string): Promise<string> {
  try {
    return await readFile(join(distClient, path), "utf8")
  } catch {
    failures.push("missing dist/client/" + path)
    return ""
  }
}

async function outputExists(path: string): Promise<boolean> {
  try {
    await access(join(distClient, path))
    return true
  } catch {
    return false
  }
}

async function outputPathRead(routePath: string): Promise<string | undefined> {
  const relativePath = routePath.replace(/^\/+|\/+$/gu, "")
  for (const candidate of [relativePath + ".html", relativePath + "/index.html"]) {
    if (await outputExists(candidate)) return candidate
  }
  return undefined
}

const listingPath = "/ratgeber"
const listingOutputPath = await outputPathRead(listingPath)
if (listingOutputPath === undefined) {
  failures.push("missing prerendered content listing: " + listingPath)
} else {
  const listingHtml = await readOutput(listingOutputPath)
  if (!listingHtml.includes("Ratgeber")) failures.push(listingOutputPath + ": missing content listing heading")
  const listingUrl = new URL(listingPath, siteUrl).toString()
  if (!sitemap.includes(listingUrl)) failures.push("sitemap.xml: missing content listing " + listingUrl)
}

for (const entry of allContent) {
  const outputPath = await outputPathRead(entry.path)
  if (outputPath === undefined) {
    failures.push("missing prerendered article: " + entry.path)
    continue
  }

  const html = await readOutput(outputPath)
  if (!html.includes(entry.title)) failures.push(outputPath + ": missing article title")

  const absoluteUrl = new URL(entry.path, siteUrl).toString()
  if (isPublishedAtBuild(entry, buildDate) && !sitemap.includes(absoluteUrl))
    failures.push("sitemap.xml: missing published article " + absoluteUrl)
  if (!isPublishedAtBuild(entry, buildDate) && sitemap.includes(absoluteUrl))
    failures.push("sitemap.xml: future article was published " + absoluteUrl)
}

if (failures.length > 0) {
  console.error("Content output verification failed:\n" + failures.map((failure) => "- " + failure).join("\n"))
  process.exitCode = 1
} else {
  console.log(
    `Verified ${allContent.length} prerendered content article${allContent.length === 1 ? "" : "s"} and sitemap publication rules.`,
  )
}
