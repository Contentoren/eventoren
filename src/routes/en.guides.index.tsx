import { createFileRoute } from "@tanstack/solid-router"
import { ContentHubPage } from "../app/content/ContentHubPage.tsx"
import { contentCollectionListLoad } from "../app/content/contentCollectionListLoad.ts"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { contentHubHeadCreate } from "../seo/contentHubHeadCreate.ts"

export const Route = createFileRoute("/en/guides/")({
  loader: () => contentCollectionListLoad("guides"),
  head: ({ loaderData }) => contentHubHeadCreate("guides", { items: loaderData ?? [] }),
  component: () => (
    <SiteFrame>
      <ContentHubPage collection="guides" items={Route.useLoaderData()} />
    </SiteFrame>
  ),
})
