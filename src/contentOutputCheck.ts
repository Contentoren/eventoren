import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { contentCollectionConfig } from "./app/content/contentCollectionConfig.js"
import { contentCollectionList } from "./app/content/contentCollectionList.js"
import { contentCollectionSchema } from "./app/content/contentCollectionSchema.js"
import { contentEntryList } from "./app/content/contentEntryList.js"
import { contentOutputVerify } from "./app/content/contentOutputVerify.js"
import { contentTodayRead } from "./app/content/contentTodayRead.js"
import { contentHubSeoConfig } from "./seo/contentHubSeoConfig.js"
import { seoSiteUrl } from "./seo/seoSiteUrl.js"

const distClient = join(process.cwd(), "dist", "client")

async function fileRead(path: string): Promise<string | undefined> {
  try {
    return await readFile(join(distClient, path), "utf8")
  } catch {
    return undefined
  }
}

// Same Europe/Berlin cutoff as the prerender page list, the sitemap and llms.txt.
const today = contentTodayRead()
const sitemap = await fileRead("sitemap.xml")
const result = await contentOutputVerify({
  siteUrl: seoSiteUrl,
  today,
  collections: contentCollectionSchema.options.map((collection) => ({
    name: collection,
    lang: contentCollectionConfig[collection].lang,
    pathBase: contentCollectionConfig[collection].pathBase,
    hubTitle: contentHubSeoConfig[collection].h1,
    entries: contentEntryList(collection),
  })),
  sitemap: sitemap ?? "",
  fileRead,
})
const failures = sitemap === undefined ? ["missing dist/client/sitemap.xml", ...result.failures] : result.failures
const llmsTxt = await fileRead("llms.txt")
if (llmsTxt === undefined) failures.push("missing dist/client/llms.txt")
for (const collection of contentCollectionSchema.options) {
  for (const item of contentCollectionList(collection, today)) {
    const url = new URL(item.entry.path, seoSiteUrl).toString()
    if (llmsTxt !== undefined && !llmsTxt.includes(`](${url})`)) failures.push(`llms.txt: missing ${url}`)
  }
}

if (failures.length > 0) {
  console.error("Content output verification failed:\n" + failures.map((failure) => "- " + failure).join("\n"))
  process.exitCode = 1
} else {
  console.log(`Verified ${result.verifiedCount} prerendered Ratgeber/Guides pages and sitemap publication rules.`)
}
