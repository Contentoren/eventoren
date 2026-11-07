import { mdiChevronDown } from "@adaptive-ds/mdi/mdiChevronDown.js"
import { For, Show } from "solid-js"
import { LinkTextInternal } from "#ui/interactive/link/LinkText.tsx"
import { Icon } from "#ui/static/icon/Icon.tsx"
import { Img } from "#ui/static/img/Img.tsx"
import { DotPill } from "#ui/static/pill/DotPill.tsx"
import type { ContentArticlePageData } from "./ContentArticlePageData.ts"
import { ContentBreadcrumbs } from "./ContentBreadcrumbs.tsx"
import { ContentCardView } from "./ContentCardView.tsx"
import { ContentCtaBox } from "./ContentCtaBox.tsx"
import { ContentToc } from "./ContentToc.tsx"
import { contentArticlePageStateCreate } from "./contentArticlePageStateCreate.ts"

/** Ratgeber / Guides article: breadcrumb, category, H1, lead, meta, hero, TOC, body, CTA, related, language switch. */
export function ContentArticleView(props: { readonly data: () => ContentArticlePageData }) {
  const state = contentArticlePageStateCreate({ data: props.data })
  return (
    <main id="content" tabindex="-1" lang={state.lang()} class="flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div class="mx-auto max-w-6xl">
        <ContentBreadcrumbs label={state.labels().breadcrumbAria} items={state.breadcrumbs()} />

        <header class="mt-6 max-w-3xl">
          <DotPill tone="brand" dot={false}>
            {state.categoryLabel()}
          </DotPill>
          <h1 class="mt-4 text-3xl font-bold tracking-tight text-content text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
            {state.entry().title}
          </h1>
          <p class="mt-4 text-lg leading-relaxed text-content-muted sm:text-xl">{state.entry().description}</p>
          <p class="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-content-muted">
            <Show when={state.author()}>
              {(author) => (
                <>
                  <span class="font-medium text-content">{author()}</span>
                  <span aria-hidden="true">·</span>
                </>
              )}
            </Show>
            <time datetime={state.dateIso()}>{state.dateLabel()}</time>
            <span aria-hidden="true">·</span>
            <span>{state.readingTime()}</span>
          </p>
          <Show when={state.translation()}>
            {(translation) => (
              <p class="mt-3 text-sm">
                <LinkTextInternal
                  to={translation().href as never}
                  hreflang={translation().lang}
                  lang={translation().lang}
                  class="break-normal font-medium text-brand-strong hover:text-brand-accent"
                >
                  {translation().label} →
                </LinkTextInternal>
              </p>
            )}
          </Show>
        </header>

        <Show when={state.heroImage()}>
          {(image) => (
            <Img
              src={image().src}
              alt={image().alt}
              width={image().width}
              height={image().height}
              eager
              fetchPriority="high"
              class="mt-8 aspect-video w-full rounded-card object-cover"
            />
          )}
        </Show>

        <div class="mt-8 grid items-start gap-8 lg:mt-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
          <aside class="min-w-0 lg:sticky lg:top-24">
            <Show when={state.toc().length > 0}>
              <details class="group rounded-card border border-border-subtle bg-surface lg:hidden">
                <summary class="focus-ring flex cursor-pointer items-center justify-between rounded-card px-5 py-4 text-sm font-semibold text-content">
                  {state.labels().toc}
                  <Icon
                    path={mdiChevronDown}
                    class="size-5 text-content-muted transition-transform group-open:rotate-180"
                  />
                </summary>
                <div class="px-3 pb-4">
                  <ContentToc label={state.labels().toc} items={state.toc()} />
                </div>
              </details>
              <div class="hidden max-h-[calc(100dvh-8rem)] overflow-y-auto lg:block">
                <p class="mb-3 text-xs font-semibold tracking-widest text-content-muted uppercase">
                  {state.labels().toc}
                </p>
                <ContentToc label={state.labels().toc} items={state.toc()} />
              </div>
            </Show>
          </aside>

          <div class="min-w-0">
            <article class="markdown-body content-article" innerHTML={state.html()} />
            <div class="mt-12 max-w-[70ch]">
              <ContentCtaBox cta={state.cta()} />
            </div>
          </div>
        </div>

        <Show when={state.related().length > 0}>
          <section aria-labelledby="related-heading" class="mt-16 border-t border-border-subtle pt-10">
            <h2 id="related-heading" class="text-2xl font-bold tracking-tight text-content">
              {state.labels().related}
            </h2>
            <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <For each={state.related()}>{(card) => <ContentCardView card={card} />}</For>
            </div>
          </section>
        </Show>
      </div>
    </main>
  )
}
