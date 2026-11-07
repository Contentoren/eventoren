import { createFileRoute } from "@tanstack/solid-router"
import { ContentHubPage } from "../app/content/ContentHubPage.tsx"
import { contentCollectionListLoad } from "../app/content/contentCollectionListLoad.ts"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { contentHubHeadCreate } from "../seo/contentHubHeadCreate.ts"

export const Route = createFileRoute("/ratgeber/")({
  loader: () => contentCollectionListLoad("ratgeber"),
  head: ({ loaderData }) => contentHubHeadCreate("ratgeber", { items: loaderData ?? [] }),
  component: () => (
    <SiteFrame>
      <ContentHubPage collection="ratgeber" items={Route.useLoaderData()} />
    </SiteFrame>
  ),
})
