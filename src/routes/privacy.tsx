import { createFileRoute } from "@tanstack/solid-router"
import { legal } from "../lib/legal.js"
import { seo } from "../lib/seo.js"
import markdownCss from "../markdown.css?url"
import { LegalPage } from "../marketing/LegalPage.js"

export const Route = createFileRoute("/privacy")({
  loader: () => legal.htmlGet("privacy"),
  head: () => ({
    meta: seo.pageMeta({
      title: "Datenschutzerklärung | Eventoren",
      description: "Datenschutzerklärung von Eventoren: Informationen zur Verarbeitung personenbezogener Daten.",
      path: "/privacy",
    }),
    links: [
      { rel: "canonical", href: seo.canonicalLink("/privacy").href },
      { rel: "stylesheet", href: markdownCss },
    ],
  }),
  component: () => <LegalPage html={Route.useLoaderData()} />,
})
