import { createFileRoute } from "@tanstack/solid-router"
import { ContentIndexPage } from "../../app/content/ContentIndexPage.tsx"
import { publishedContent } from "../../app/content/contentList.js"
import { seo } from "../../lib/seo.js"

const siteName = "Adaptive website"
const description = "Ratgeber und Fachbeiträge von Adaptive website."

export const Route = createFileRoute("/ratgeber/")({
  head: () => ({
    meta: seo.pageMeta({ title: `Ratgeber | ${siteName}`, description, path: "/ratgeber" }),
    links: [seo.canonicalLink("/ratgeber")],
  }),
  component: () => (
    <ContentIndexPage posts={publishedContent()} description={`Veröffentlichte Beiträge von ${siteName}.`} />
  ),
})
