import { createFileRoute, Link, notFound } from "@tanstack/solid-router"
import { contentBySlug } from "../../app/content/contentList.js"
import { contentRead } from "../../app/content/contentRead.js"
import { ContentImage } from "../../app/content/ContentImage.jsx"
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
  component: ArticlePage,
})

function ArticlePage() {
  const params = Route.useParams()
  const articleContent = Route.useLoaderData()
  const entry = contentBySlug(params().slug)
  if (entry === undefined) throw notFound()

  return (
    <>
      <main class="mx-auto max-w-4xl px-6 py-16">
        <Link to="/ratgeber" class="underline">
          ← All articles
        </Link>
        <article class="mt-10">
          <p class="text-sm text-muted-foreground">{entry.publishedAt}</p>
          <h1 class="mt-3 text-4xl font-bold">{entry.title}</h1>
          {entry.author && <p class="mt-3 text-muted-foreground">by {entry.author}</p>}
          <ContentImage entry={entry} fallbackAlt={entry.title} isHero class="mt-8 aspect-[2/1] w-full object-cover" />
          <div class="markdown-body mt-10" innerHTML={articleContent().html} />
        </article>
      </main>
    </>
  )
}
