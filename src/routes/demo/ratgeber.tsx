import { createFileRoute } from "@tanstack/solid-router"
import { ContentIndexPage } from "../../app/content/ContentIndexPage.tsx"
import { demoStaticPages } from "../../demo/fixtures/demoStaticPages.ts"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"

export const Route = createFileRoute("/demo/ratgeber")({
  head: () => demoRouteHeadCreate("Ratgeber demo", "Review local Eventoren guide articles.", "/demo/ratgeber"),
  loader: () => demoStaticPages.content.entries,
  component: () => (
    <ContentIndexPage
      posts={Route.useLoaderData()()}
      description="Veröffentlichte Beiträge von Adaptive website."
      pathPrefix="/demo"
    />
  ),
})
