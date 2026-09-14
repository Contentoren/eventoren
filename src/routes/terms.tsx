import { createFileRoute } from "@tanstack/solid-router"
import markdownCss from "../markdown.css?url"
import { legal } from "../lib/legal.js"
import { seo } from "../lib/seo.js"
import { LegalPage } from "../marketing/LegalPage.js"

export const Route = createFileRoute("/terms")({
  loader: () => legal.htmlGet("terms"),
  head: () => ({
    meta: seo.pageMeta({
      title: "Terms",
      description: "Terms governing access to and use of this website.",
      path: "/terms",
    }),
    links: [
      { rel: "canonical", href: seo.canonicalLink("/terms").href },
      { rel: "stylesheet", href: markdownCss },
    ],
  }),
  component: () => <LegalPage html={Route.useLoaderData()} />,
})
