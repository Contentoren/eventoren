import { createFileRoute } from "@tanstack/solid-router"
import { SiteFrame } from "../components/SiteFrame.tsx"
import markdownCss from "../markdown.css?url"
import { legal } from "../lib/legal.js"
import { seo } from "../lib/seo.js"
import { LegalPage } from "../marketing/LegalPage.js"

export const Route = createFileRoute("/datenschutz")({
  loader: () => legal.htmlGet("datenschutz"),
  head: () => ({
    meta: seo.pageMeta({
      title: "Datenschutz",
      description: "Informationen zur Verarbeitung personenbezogener Daten und zu deinen Datenschutzrechten.",
      path: "/datenschutz",
    }),
    links: [
      { rel: "canonical", href: seo.canonicalLink("/datenschutz").href },
      { rel: "stylesheet", href: markdownCss },
    ],
  }),
  component: () => (
    <SiteFrame>
      <LegalPage html={Route.useLoaderData()} title="Datenschutzerklärung" />
    </SiteFrame>
  ),
})
