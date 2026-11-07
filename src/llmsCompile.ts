import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { contentCollectionList } from "./app/content/contentCollectionList.js"
import { contentTodayRead } from "./app/content/contentTodayRead.js"
import { llmsTxtCreate } from "./llms/llmsTxtCreate.js"
import { seoSiteUrl } from "./seo/seoSiteUrl.js"

// Publication cutoff in Europe/Berlin, the same calendar day the prerender and the sitemap use.
const today = contentTodayRead()
const distClient = join(process.cwd(), "dist", "client")
const ratgeber = contentCollectionList("ratgeber", today)
const guides = contentCollectionList("guides", today)

await mkdir(distClient, { recursive: true })
await writeFile(join(distClient, "llms.txt"), llmsTxtCreate({ siteUrl: seoSiteUrl, ratgeber, guides }), "utf8")
console.log(`Wrote llms.txt with ${ratgeber.length} Ratgeber and ${guides.length} Guides articles.`)
