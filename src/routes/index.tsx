import { createFileRoute } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { HomePage } from "../marketing/HomePage.js"
import { seo } from "../lib/seo.js"
import { eventDiscoverySearchParse } from "../events/eventDiscoverySearchParse.js"
import { catalogEventsPublicGet } from "../server/catalogEventsPublicGet.js"

const siteName = "eventoren"
const description = "A public Solid website built with Adaptive DS."
const getCatalogEvents = createServerFn({ method: "GET" }).handler(catalogEventsPublicGet)

export const Route = createFileRoute("/")({
  validateSearch: eventDiscoverySearchParse,
  loader: () => getCatalogEvents(),
  head: () => ({
    meta: seo.pageMeta({ title: siteName, description, path: "/" }),
    links: [seo.canonicalLink("/")],
  }),
  component: () => <HomePage eventsResult={Route.useLoaderData()} />,
})
