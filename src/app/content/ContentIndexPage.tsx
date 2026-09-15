import { Link } from "@tanstack/solid-router"
import { ContentImage } from "./ContentImage.jsx"
import type { ContentEntry } from "./contentList.js"
import { contentPathApply } from "./contentPathApply.ts"

export function ContentIndexPage(props: {
  readonly posts: readonly ContentEntry[]
  readonly description: string
  readonly pathPrefix?: string
}) {
  return (
    <section class="mx-auto max-w-5xl px-6 py-16">
      <h1 class="text-4xl font-bold">Ratgeber</h1>
      <p class="mt-4 text-muted-foreground">{props.description}</p>
      {props.posts.length === 0 ? (
        <p class="mt-10 text-muted-foreground">Noch keine Beiträge veröffentlicht.</p>
      ) : (
        <div class="mt-10 grid gap-6 md:grid-cols-2">
          {props.posts.map((post) => (
            <article class="rounded-xl border p-6">
              <ContentImage entry={post} fallbackAlt={post.title} class="mb-5 aspect-[2/1] w-full object-cover" />
              <p class="text-sm text-muted-foreground">{post.publishedAt}</p>
              <h2 class="mt-2 text-xl font-semibold">
                <Link to={contentPathApply(post.path, props.pathPrefix) as never} class="underline">
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
