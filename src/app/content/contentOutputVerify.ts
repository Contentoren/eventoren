import type { ContentEntry } from "@adaptive-ds/website-content-pipeline"

type ContentOutputCollection = {
  readonly name: string
  readonly lang: "de" | "en"
  readonly pathBase: string
  readonly hubTitle: string
  readonly entries: readonly ContentEntry[]
}

/** Prerendered file of a route path: `/ratgeber/x` → `ratgeber/x.html` (autoSubfolderIndex is off). */
function contentOutputFileRead(routePath: string): string {
  return `${routePath.replace(/^\/+|\/+$/gu, "")}.html`
}

function htmlLangRead(html: string): string | undefined {
  return /<html\b[^>]*\blang\s*=\s*["']?([\w-]+)/iu.exec(html)?.[1]
}

function htmlTextEscape(value: string): string {
  return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;")
}

/**
 * Verifies the static Ratgeber/Guides output: each hub and each published entry has its prerendered
 * HTML with the title and the collection's `<html lang>`, and is in the sitemap; unpublished (future)
 * entries have neither a file nor a sitemap entry. `fileRead` returns undefined for a missing file.
 */
export async function contentOutputVerify(input: {
  readonly siteUrl: string
  readonly today: string
  readonly collections: readonly ContentOutputCollection[]
  readonly sitemap: string
  readonly fileRead: (path: string) => Promise<string | undefined>
}): Promise<{ readonly failures: string[]; readonly verifiedCount: number }> {
  const failures: string[] = []
  let verifiedCount = 0
  const sitemapLocs = new Set(
    [...input.sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((match) => (match[1] ?? "").trim()),
  )
  const pageVerify = async (path: string, title: string, lang: string, label: string) => {
    const file = contentOutputFileRead(path)
    const html = await input.fileRead(file)
    if (html === undefined) {
      failures.push(`missing prerendered ${label}: dist/client/${file}`)
      return
    }
    if (!html.includes(htmlTextEscape(title)) && !html.includes(title)) failures.push(`${file}: missing title`)
    if (htmlLangRead(html) !== lang) failures.push(`${file}: expected <html lang="${lang}">`)
    const loc = new URL(path, input.siteUrl).toString()
    if (!sitemapLocs.has(loc)) failures.push(`sitemap.xml: missing ${loc}`)
    verifiedCount += 1
  }

  for (const collection of input.collections) {
    await pageVerify(collection.pathBase, collection.hubTitle, collection.lang, `${collection.name} hub`)
    for (const entry of collection.entries) {
      if (entry.publishedAt <= input.today) {
        await pageVerify(entry.path, entry.title, collection.lang, `${collection.name} article`)
        continue
      }
      const file = contentOutputFileRead(entry.path)
      if ((await input.fileRead(file)) !== undefined) failures.push(`unpublished entry was prerendered: ${file}`)
      const loc = new URL(entry.path, input.siteUrl).toString()
      if (sitemapLocs.has(loc)) failures.push(`sitemap.xml: unpublished entry listed ${loc}`)
    }
  }
  return { failures, verifiedCount }
}
