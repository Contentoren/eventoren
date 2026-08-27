import { createFileRoute } from "@tanstack/solid-router"
import { LegalMarkdownPage } from "../components/LegalMarkdownPage"
import { legalDocumentLoad } from "../legal/actions/legalDocumentLoad"
import markdownCss from "../markdown.css?url"
import { seoHeadCreate } from "../seo/seoHeadCreate"

export const Route = createFileRoute("/impressum")({
  head: () => {
    const head = seoHeadCreate("/impressum")
    return { ...head, links: [...head.links, { rel: "stylesheet", href: markdownCss }] }
  },
  loader: () => legalDocumentLoad({ data: { name: "impressum" } }),
  component: ImpressumPage,
})

function ImpressumPage() {
  const document = Route.useLoaderData()
  return <LegalMarkdownPage title={document().title} html={document().html} />
}
