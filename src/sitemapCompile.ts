import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { allContent, isPublishedAtBuild } from "./app/content/contentList.js"
import { seoPages } from "./seo/seoPages.js"
import { seoSiteUrl } from "./seo/seoSiteUrl.js"

const distClient = join(process.cwd(), "dist", "client")
const buildDate = new Date().toISOString().slice(0, 10)

const extraPages = seoPages.some((candidate) => candidate.path === "/datenschutz")
  ? []
  : [{ path: "/datenschutz", changefreq: "yearly", priority: 0.2 } as const]
const pageEntries = [...seoPages, ...extraPages]
const urls = pageEntries
  .filter((page) => (page as { readonly noindex?: boolean }).noindex !== true)
  .map((page) => ({
    loc: seoSiteUrl + page.path,
    lastmod: buildDate,
    changefreq: page.changefreq,
    priority: page.priority,
  }))
for (const entry of allContent) {
  if (!isPublishedAtBuild(entry, buildDate)) continue
  urls.push({
    loc: new URL(entry.path, seoSiteUrl).toString(),
    lastmod: entry.updatedAt ?? entry.publishedAt,
    changefreq: "monthly",
    priority: 0.6,
  })
}
urls.sort((a, b) => (a.loc < b.loc ? -1 : a.loc > b.loc ? 1 : 0))

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls
    .map(
      (entry) =>
        `  <url>\n    <loc>${entry.loc}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`,
    )
    .join("\n") +
  "\n</urlset>\n"

await mkdir(distClient, { recursive: true })
await writeFile(join(distClient, "sitemap.xml"), xml, "utf8")
console.log(`Wrote sitemap.xml with ${urls.length} URLs.`)
