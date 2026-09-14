import { createFileRoute } from "@tanstack/solid-router"
import { LegalMarkdownPage } from "../components/LegalMarkdownPage.tsx"
import { legalDocumentLoad } from "../legal/actions/legalDocumentLoad.ts"
import markdownCss from "../markdown.css?url"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"

export const Route = createFileRoute("/agb")({
  head: () => {
    const head = seoHeadCreate("/agb")
    return { ...head, links: [...head.links, { rel: "stylesheet", href: markdownCss }] }
  },
  loader: () => legalDocumentLoad({ data: { name: "agb" } }),
  component: AgbPage,
})

function AgbPage() {
  const document = Route.useLoaderData()
  return <LegalMarkdownPage title={document().title} html={document().html} />
}
