import { createFileRoute, notFound } from "@tanstack/solid-router"
import { ContentArticlePage } from "../../app/content/ContentArticlePage.tsx"
import { demoStaticPages } from "../../demo/fixtures/demoStaticPages.ts"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DemoScenarioFrame } from "../../demo/ui/DemoScenarioFrame.tsx"

export const Route = createFileRoute("/demo/ratgeber/$slug")({
  head: ({ params }) =>
    demoRouteHeadCreate(
      `Ratgeber: ${params.slug}`,
      "Review a local Eventoren guide article.",
      `/demo/ratgeber/${params.slug}`,
    ),
  loader: ({ params }) => {
    const entry = demoStaticPages.content.entries.find((item) => item.slug === params.slug)
    if (entry === undefined) throw notFound()
    const articleContent = demoStaticPages.content.html[entry.contentPath]
    if (articleContent === undefined) throw notFound()
    return { entry, articleContent }
  },
  component: () => {
    const data = Route.useLoaderData()
    return (
      <DemoScenarioFrame currentId="ratgeber-article">
        <ContentArticlePage entry={data().entry} articleContent={data().articleContent} pathPrefix="/demo" />
      </DemoScenarioFrame>
    )
  },
})
