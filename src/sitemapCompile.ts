import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { contentCollectionList } from "./app/content/contentCollectionList.js"
import { contentCollectionSchema } from "./app/content/contentCollectionSchema.js"
import { contentTodayRead } from "./app/content/contentTodayRead.js"
import { envBaseUrlSiteResult } from "./app/env/public/envBaseUrlSiteResult.js"
import { envEnvModeResult } from "./app/env/public/envEnvModeResult.js"
import { seoPages } from "./seo/seoPages.js"
import { seoSiteUrl } from "./seo/seoSiteUrl.js"
import { sitemapContentUrlListCreate } from "./sitemap/sitemapContentUrlListCreate.js"
import { sitemapEventUrlListCreate } from "./sitemap/sitemapEventUrlListCreate.js"
import { sitemapProductionCatalogEnabled } from "./sitemap/sitemapProductionCatalogEnabled.js"
import type { SitemapUrlEntry } from "./sitemap/sitemapUrlEntry.js"
import { sitemapUrlListCreate } from "./sitemap/sitemapUrlListCreate.js"
import { sitemapXmlCreate } from "./sitemap/sitemapXmlCreate.js"

const distClient = join(process.cwd(), "dist", "client")
// Publication cutoff in Europe/Berlin, the same calendar day the prerender and the views use.
const today = contentTodayRead()

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
  pages: seoPages,
  content: sitemapContentUrlListCreate({
    siteUrl: seoSiteUrl,
    today,
    items: contentCollectionSchema.options.flatMap((collection) => contentCollectionList(collection, today)),
  }),
  events: eventEntries,
})

const xml = sitemapXmlCreate(urls)

await mkdir(distClient, { recursive: true })
await writeFile(join(distClient, "sitemap.xml"), xml, "utf8")
console.log(`Wrote sitemap.xml with ${urls.length} URLs.`)
