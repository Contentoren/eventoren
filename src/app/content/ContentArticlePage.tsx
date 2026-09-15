import { Link } from "@tanstack/solid-router"
import { ContentImage } from "./ContentImage.jsx"
import type { ContentEntry } from "./contentList.js"
import { contentPathApply } from "./contentPathApply.ts"
import type { ContentReadResult } from "./contentRead.js"

export function ContentArticlePage(props: {
  readonly entry: ContentEntry
  readonly articleContent: ContentReadResult
  readonly pathPrefix?: string
}) {
  return (
    <main class="mx-auto max-w-4xl px-6 py-16">
      <Link to={contentPathApply("/ratgeber", props.pathPrefix) as never} class="underline">
        ← All articles
      </Link>
      <article class="mt-10">
        <p class="text-sm text-muted-foreground">{props.entry.publishedAt}</p>
        <h1 class="mt-3 text-4xl font-bold">{props.entry.title}</h1>
        {props.entry.author && <p class="mt-3 text-muted-foreground">by {props.entry.author}</p>}
        <ContentImage
          entry={props.entry}
          fallbackAlt={props.entry.title}
          isHero
          class="mt-8 aspect-[2/1] w-full object-cover"
        />
        <div class="markdown-body mt-10" innerHTML={props.articleContent.html} />
      </article>
    </main>
  )
}
