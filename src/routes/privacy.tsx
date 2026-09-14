import { createFileRoute } from "@tanstack/solid-router"
import markdownCss from "../markdown.css?url"
import { legal } from "../lib/legal.js"
import { seo } from "../lib/seo.js"
import { LegalPage } from "../marketing/LegalPage.js"

export const Route = createFileRoute("/privacy")({
  loader: () => legal.htmlGet("privacy"),
  head: () => ({
    meta: seo.pageMeta({
      title: "Privacy",
      description: "Information about how this website collects, uses, and protects personal data.",
      path: "/privacy",
    }),
    links: [
      { rel: "canonical", href: seo.canonicalLink("/privacy").href },
      { rel: "stylesheet", href: markdownCss },
    ],
  }),
  component: () => <LegalPage html={Route.useLoaderData()} />,
})
