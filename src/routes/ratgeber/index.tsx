import { createFileRoute, Link } from "@tanstack/solid-router"
import { publishedContent } from "../../app/content/contentList.js"
import { ContentImage } from "../../app/content/ContentImage.jsx"
import { seo } from "../../lib/seo.js"

const siteName = "Adaptive website"
const description = "Ratgeber und Fachbeiträge von Adaptive website."

export const Route = createFileRoute("/ratgeber/")({
  head: () => ({
    meta: seo.pageMeta({ title: "Ratgeber | " + siteName, description, path: "/ratgeber" }),
    links: [seo.canonicalLink("/ratgeber")],
  }),
  component: ArticleIndexPage,
})

function ArticleIndexPage() {
  const posts = publishedContent()
  return (
    <section class="mx-auto max-w-5xl px-6 py-16">
      <h1 class="text-4xl font-bold">Ratgeber</h1>
      <p class="mt-4 text-muted-foreground">Veröffentlichte Beiträge von {siteName}.</p>
      {posts.length === 0 ? (
        <p class="mt-10 text-muted-foreground">Noch keine Beiträge veröffentlicht.</p>
      ) : (
        <div class="mt-10 grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <article class="rounded-xl border p-6">
              <ContentImage entry={post} fallbackAlt={post.title} class="mb-5 aspect-[2/1] w-full object-cover" />
              <p class="text-sm text-muted-foreground">{post.publishedAt}</p>
              <h2 class="mt-2 text-xl font-semibold">
                <Link to={post.path as never} class="underline">
                  {post.title}
                </Link>
              </h2>
              <p class="mt-2 text-muted-foreground">{post.description}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
