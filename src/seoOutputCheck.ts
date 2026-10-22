import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

const projectRoot = process.cwd()
const routesDirectory = join(projectRoot, "src", "routes")
const failures: string[] = []

const seoHeadSource = await readFile(join(projectRoot, "src", "seo", "seoHeadCreate.ts"), "utf8")
if (!seoHeadSource.includes("{ noindex: true }") && !seoHeadSource.includes("noindex?: boolean"))
  failures.push("src/seo/seoHeadCreate.ts: missing noindex option for app-private routes")

const seoPagesSource = await readFile(join(projectRoot, "src", "seo", "seoPages.ts"), "utf8")
const seoPagePaths = [...seoPagesSource.matchAll(/path:\s*"([^"]+)"/gu)].map((match) => match[1])
if (new Set(seoPagePaths).size !== seoPagePaths.length) failures.push("src/seo/seoPages.ts: duplicate page paths")

const speculationSource = await readFile(join(routesDirectory, "speculationRules.ts"), "utf8")
for (const excluded of [
  "/admin",
  "/organizer",
  "/veranstalter",
  "/bestellungen",
  "/checkout",
  "/sso",
  "/konto",
  "/demo",
]) {
  if (!speculationSource.includes(excluded))
    failures.push("src/routes/speculationRules.ts: missing exclusion " + excluded)
}

const entries = await readdir(routesDirectory, { withFileTypes: true })
for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith(".tsx")) continue
  const relativePath = "src/routes/" + entry.name
  const contents = await readFile(join(routesDirectory, entry.name), "utf8")
  const robotsTags = contents.match(/["']robots["']/gu) ?? []
  if (robotsTags.length > 1) failures.push(relativePath + ": duplicate robots meta tags (" + robotsTags.length + ")")
  const seoHeadCalls = contents.match(/seoHeadCreate\(/gu) ?? []
  if (seoHeadCalls.length > 1)
    failures.push(relativePath + ": seoHeadCreate called " + seoHeadCalls.length + "x; pass { noindex: true } once")
  for (const match of contents.matchAll(/seoHeadCreate\("([^"]+)"([^)]*)\)/gu)) {
    const target = match[1] ?? ""
    const options = match[2] ?? ""
    if (!seoPagePaths.includes(target) && !options.includes("noindex"))
      failures.push(relativePath + ': seoHeadCreate("' + target + '") without seoPages entry or { noindex: true }')
  }
}

let robotsTxt = ""
try {
  robotsTxt = await readFile(join(projectRoot, "public", "robots.txt"), "utf8")
} catch {
  failures.push("public/robots.txt: missing")
}
if (robotsTxt !== "" && !robotsTxt.includes("Allow: /")) failures.push("public/robots.txt: missing Allow: /")
if (robotsTxt !== "" && !robotsTxt.includes("Sitemap: https://eventoren.de/sitemap.xml"))
  failures.push("public/robots.txt: missing Sitemap directive")

if (failures.length > 0) {
  console.error("SEO output verification failed:\n" + failures.map((failure) => "- " + failure).join("\n"))
  process.exitCode = 1
} else {
  console.log("Verified SEO head output: single robots tags, canonical coverage, speculation exclusions.")
}
