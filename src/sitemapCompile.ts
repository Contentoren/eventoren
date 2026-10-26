import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { allContent } from "./app/content/contentList.js"
import { envBaseUrlSiteResult } from "./app/env/public/envBaseUrlSiteResult.js"
import { envEnvModeResult } from "./app/env/public/envEnvModeResult.js"
import { seoPages } from "./seo/seoPages.js"
import { seoSiteUrl } from "./seo/seoSiteUrl.js"
import { sitemapEventUrlListCreate } from "./sitemap/sitemapEventUrlListCreate.js"
import { sitemapProductionCatalogEnabled } from "./sitemap/sitemapProductionCatalogEnabled.js"
import type { SitemapUrlEntry } from "./sitemap/sitemapUrlEntry.js"
import { sitemapUrlListCreate } from "./sitemap/sitemapUrlListCreate.js"
import { sitemapXmlCreate } from "./sitemap/sitemapXmlCreate.js"

const distClient = join(process.cwd(), "dist", "client")
const buildDate = new Date().toISOString().slice(0, 10)

const envModeResult = envEnvModeResult()
const envMode = envModeResult.success ? envModeResult.data : undefined
const siteBaseUrlResult = envBaseUrlSiteResult()
const siteBaseUrl = siteBaseUrlResult.success ? siteBaseUrlResult.data : undefined
const productionCatalog = sitemapProductionCatalogEnabled({ envMode, siteBaseUrl })

let eventEntries: readonly SitemapUrlEntry[] = []
if (!productionCatalog) {
  if (envMode === "production")
    throw new Error(`sitemap: a production build requires PUBLIC_BASE_URL_SITE=${seoSiteUrl}`)
  console.warn(
    "sitemap: skipped the published event URLs because this build does not run in the production environment.",
  )
} else {
  const eventResult = await sitemapEventUrlListCreate()
  if (!eventResult.success)
    throw new Error(`sitemap: could not read the published catalog: ${eventResult.errorMessage}`)
  eventEntries = eventResult.data
}

const urls = sitemapUrlListCreate({
  siteUrl: seoSiteUrl,
  buildDate,
  pages: seoPages,
  articles: allContent,
  events: eventEntries,
})

const xml = sitemapXmlCreate(urls)

await mkdir(distClient, { recursive: true })
await writeFile(join(distClient, "sitemap.xml"), xml, "utf8")
console.log(`Wrote sitemap.xml with ${urls.length} URLs.`)
