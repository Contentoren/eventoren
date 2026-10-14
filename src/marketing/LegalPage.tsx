import { For, Show } from "solid-js"
import { LinkTextExternal, LinkTextInternal } from "#ui/interactive/link/LinkText.tsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.tsx"
import { legalPageStateCreate } from "./legalPageStateCreate.ts"

export function LegalPage(props: { readonly html: () => string; readonly homeHref?: string; readonly title?: string }) {
  const state = legalPageStateCreate({ html: () => props.html() })
  return (
    <main id="content" tabindex="-1" lang="de" class="legal-page flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div
        class="mx-auto"
        classList={{ "max-w-6xl": state.headings().length > 0, "max-w-3xl": state.headings().length === 0 }}
      >
        <LinkTextInternal
          to={props.homeHref ?? "/"}
          class="mb-8 inline-flex rounded-control text-sm font-medium text-content-muted transition-colors hover:text-brand-strong sm:mb-10"
        >
          ← Zurück zur Startseite
        </LinkTextInternal>
        <Show when={props.title}>
          <header class="mb-8 sm:mb-10">
            <p class="mb-3 text-xs font-semibold tracking-widest text-brand-strong uppercase">Rechtliches</p>
            <h1 class="legal-title max-w-4xl font-bold tracking-tight text-content">{props.title}</h1>
          </header>
        </Show>
        <Show when={state.headings().length > 0}>
          <details class="legal-contents-mobile mb-5 rounded-card border border-border-subtle bg-surface lg:hidden">
            <summary class="focus-ring cursor-pointer rounded-card px-5 py-4 text-sm font-semibold text-content">
              Inhaltsübersicht
            </summary>
            <nav aria-label="Inhaltsübersicht" class="px-3 pb-3">
              <ol class="legal-contents-list">
                <For each={state.headings()}>
                  {(heading) => (
                    <li>
                      <LinkTextExternal class="legal-contents-link" href={`#${heading.id}`} innerHTML={heading.html} />
                    </li>
                  )}
                </For>
              </ol>
            </nav>
          </details>
        </Show>
        <div
          class="grid items-start gap-8 lg:gap-10"
          classList={{ "lg:grid-cols-[minmax(0,1fr)_15rem]": state.headings().length > 0 }}
        >
          <CardWrapper
            class="legal-document markdown-body min-w-0 rounded-card border-border-subtle p-5 shadow-sm sm:p-8 lg:p-10"
            innerHTML={state.html()}
          />
          <Show when={state.headings().length > 0}>
            <nav aria-label="Inhaltsübersicht" class="legal-contents-desktop sticky top-28 hidden min-w-0 lg:block">
              <h2 class="mb-4 text-xs font-semibold tracking-widest text-content-muted uppercase">Inhaltsübersicht</h2>
              <ol class="legal-contents-list border-l border-border-subtle pl-3">
                <For each={state.headings()}>
                  {(heading) => (
                    <li>
                      <LinkTextExternal class="legal-contents-link" href={`#${heading.id}`} innerHTML={heading.html} />
                    </li>
                  )}
                </For>
              </ol>
            </nav>
          </Show>
        </div>
      </div>
    </main>
  )
}
