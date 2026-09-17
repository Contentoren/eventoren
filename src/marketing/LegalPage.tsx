import { Link } from "@tanstack/solid-router"

export function LegalPage(props: { readonly html: () => string; readonly homeHref?: string; readonly title?: string }) {
  return (
    <main id="content" tabindex="-1" class="flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <div class="mx-auto max-w-3xl">
        <Link
          to={props.homeHref ?? "/"}
          class="focus-ring mb-10 inline-flex rounded-control text-sm font-medium text-content-muted transition-colors hover:text-brand-strong sm:mb-12"
        >
          ← Zurück zur Startseite
        </Link>
        {props.title ? (
          <h1 class="mb-10 text-4xl leading-tight font-bold tracking-tight text-content sm:mb-12 sm:text-5xl">
            {props.title}
          </h1>
        ) : null}
        <article class="markdown-body" innerHTML={props.html()} />
      </div>
    </main>
  )
}
