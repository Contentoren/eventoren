import { mdiBookOpenPageVariant } from "@adaptive-ds/mdi/mdiBookOpenPageVariant.js"
import { For, Show } from "solid-js"
import { buttonVariant } from "#ui/interactive/button/buttonCva.ts"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.tsx"
import { LinkTextExternal, LinkTextInternal } from "#ui/interactive/link/LinkText.tsx"
import { EmptyState } from "#ui/static/empty/EmptyState.tsx"
import { Img } from "#ui/static/img/Img.tsx"
import { ContentBreadcrumbs } from "./ContentBreadcrumbs.tsx"
import { ContentCardView } from "./ContentCardView.tsx"
import { ContentFeaturedCardView } from "./ContentFeaturedCardView.tsx"
import type { ContentListItem } from "./ContentListItem.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"
import { contentHubPageStateCreate } from "./contentHubPageStateCreate.ts"

/** Ratgeber / Guides hub: breadcrumb, H1, intro, category jump-nav, category sections with cards, CTA. */
export function ContentHubPage(props: {
  readonly collection: ContentCollection
  readonly items: () => readonly ContentListItem[]
}) {
  const state = contentHubPageStateCreate({ collection: () => props.collection, items: props.items })
  return (
    <main id="content" tabindex="-1" lang={state.lang()} class="flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div class="mx-auto max-w-6xl">
        <ContentBreadcrumbs label={state.labels().breadcrumbAria} items={state.breadcrumbs()} />
        <header
          class={state.heroImage() === undefined ? "mt-6 max-w-3xl" : "mt-6 grid items-center gap-8 lg:grid-cols-2"}
        >
          <div>
            <h1 class="text-3xl font-bold tracking-tight text-content text-balance sm:text-4xl">{state.h1()}</h1>
            <p class="mt-4 text-lg leading-relaxed text-content-muted">{state.labels().intro}</p>
            <p class="mt-3 text-sm">
              <LinkTextInternal
                to={state.otherHub().href as never}
                hreflang={state.otherHub().lang}
                lang={state.otherHub().lang}
                class="break-normal font-medium text-brand-strong hover:text-brand-accent"
              >
                {state.otherHub().label}
              </LinkTextInternal>
            </p>
          </div>
          <Show when={state.heroImage()}>
            {(image) => (
              <Img
                src={image().src}
                alt={image().alt}
                width={image().width}
                height={image().height}
                eager
                fetchPriority="high"
                class="aspect-video w-full rounded-card object-cover"
              />
            )}
          </Show>
        </header>

        <Show
          when={!state.isEmpty()}
          fallback={
            <EmptyState
              icon={mdiBookOpenPageVariant}
              title={state.labels().empty}
              description={state.labels().emptyHint}
              class="mt-10 rounded-card border border-border-subtle bg-surface"
            />
          }
        >
          <nav aria-label={state.labels().categoriesAria} class="mt-8">
            <ul class="flex flex-wrap gap-2">
              <For each={state.sections()}>
                {(section) => (
                  <li>
                    <LinkTextExternal
                      href={`#${section.id}`}
                      class="inline-flex break-normal rounded-full border border-border-subtle bg-surface px-3 py-1.5 text-sm font-medium text-content hover:border-brand hover:text-brand-strong hover:no-underline"
                    >
                      {section.label}
                      <span class="ml-1.5 text-content-muted">{section.cards.length}</span>
                    </LinkTextExternal>
                  </li>
                )}
              </For>
            </ul>
          </nav>

          <For each={state.sections()}>
            {(section) => (
              <section id={section.id} aria-labelledby={`${section.id}-heading`} class="mt-12 scroll-mt-24">
                <h2 id={`${section.id}-heading`} class="text-2xl font-bold tracking-tight text-content">
                  {section.label}
                </h2>
                <Show when={section.cards[0]}>{(first) => <ContentFeaturedCardView card={first()} />}</Show>
                <Show when={section.cards.length > 1}>
                  <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <For each={section.cards.slice(1)}>{(card) => <ContentCardView card={card} />}</For>
                  </div>
                </Show>
              </section>
            )}
          </For>
        </Show>

        <aside class="mt-14 flex flex-col items-start gap-4 rounded-card border border-brand/30 bg-brand-soft/60 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <p class="max-w-2xl text-lg font-semibold text-content">{state.labels().hubCtaText}</p>
          <LinkButtonInternal
            to="/kontakt"
            variant={buttonVariant.none}
            class="shrink-0 bg-brand px-4 py-2 text-brand-content hover:bg-brand-strong"
          >
            {state.labels().hubCtaAction}
          </LinkButtonInternal>
        </aside>
      </div>
    </main>
  )
}
