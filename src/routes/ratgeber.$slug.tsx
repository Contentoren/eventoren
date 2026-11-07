import { createFileRoute } from "@tanstack/solid-router"
import { ContentArticleView } from "../app/content/ContentArticleView.tsx"
import { contentArticleRouteHeadCreate } from "../app/content/contentArticleRouteHeadCreate.ts"
import { contentArticleRouteLoad } from "../app/content/contentArticleRouteLoad.ts"
import { SiteFrame } from "../components/SiteFrame.tsx"
import markdownCss from "../markdown.css?url"

export const Route = createFileRoute("/ratgeber/$slug")({
  loader: ({ params }) => contentArticleRouteLoad("ratgeber", params.slug),
  head: ({ loaderData }) => contentArticleRouteHeadCreate(loaderData, markdownCss),
  component: () => (
    <SiteFrame>
      <ContentArticleView data={Route.useLoaderData()} />
    </SiteFrame>
  ),
})
