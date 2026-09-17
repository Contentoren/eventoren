import { createFileRoute } from "@tanstack/solid-router"
import { legal } from "../lib/legal.js"
import { seo } from "../lib/seo.js"
import markdownCss from "../markdown.css?url"
import { LegalPage } from "../marketing/LegalPage.js"

export const Route = createFileRoute("/terms")({
  loader: () => legal.htmlGet("terms"),
  head: () => ({
    meta: seo.pageMeta({
      title: "Allgemeine Geschäftsbedingungen (AGB) | Eventoren",
      description: "Allgemeine Geschäftsbedingungen für die Nutzung von Eventoren und den Ticketkauf.",
      path: "/terms",
    }),
    links: [
      { rel: "canonical", href: seo.canonicalLink("/terms").href },
      { rel: "stylesheet", href: markdownCss },
    ],
  }),
  component: () => <LegalPage html={Route.useLoaderData()} />,
})
