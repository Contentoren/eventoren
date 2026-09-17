import { createFileRoute } from "@tanstack/solid-router"
import { SiteFrame } from "../components/SiteFrame.tsx"
import markdownCss from "../markdown.css?url"
import { legal } from "../lib/legal.js"
import { seo } from "../lib/seo.js"
import { LegalPage } from "../marketing/LegalPage.js"

export const Route = createFileRoute("/impressum")({
  loader: () => legal.htmlGet("impressum"),
  head: () => ({
    meta: seo.pageMeta({
      title: "Impressum",
      description: "Gesetzliche Betreiberangaben und Kontaktinformationen dieser Website.",
      path: "/impressum",
    }),
    links: [
      { rel: "canonical", href: seo.canonicalLink("/impressum").href },
      { rel: "stylesheet", href: markdownCss },
    ],
  }),
  component: () => (
    <SiteFrame>
      <LegalPage html={Route.useLoaderData()} title="Impressum" />
    </SiteFrame>
  ),
})
