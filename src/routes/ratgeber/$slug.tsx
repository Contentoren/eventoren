import { createFileRoute, notFound } from "@tanstack/solid-router"
import { ContentArticlePage } from "../../app/content/ContentArticlePage.tsx"
import { contentBySlug } from "../../app/content/contentList.js"
import { contentRead } from "../../app/content/contentRead.js"
import { seo } from "../../lib/seo.js"
import markdownCss from "../../markdown.css?url"

export const Route = createFileRoute("/ratgeber/$slug")({
  loader: async ({ params }) => {
    const entry = contentBySlug(params.slug)
    if (entry === undefined) throw notFound()
    return contentRead(entry)
  },
  head: ({ params }) => {
    const entry = contentBySlug(params.slug)
    if (entry === undefined) return { meta: [{ title: "Article not found" }, { name: "robots", content: "noindex" }] }
    const head = seo.createArticleSeoHead(entry)
    return { ...head, links: [...head.links, { rel: "stylesheet", href: markdownCss }] }
  },
  component: () => {
    const params = Route.useParams()
    const articleContent = Route.useLoaderData()
    const entry = contentBySlug(params().slug)
    if (entry === undefined) throw notFound()
    return <ContentArticlePage entry={entry} articleContent={articleContent()} />
  },
})
