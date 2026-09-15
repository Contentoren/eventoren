import { Link } from "@tanstack/solid-router"

export function LegalPage(props: { readonly html: () => string; readonly homeHref?: string }) {
  return (
    <main class="min-h-screen bg-gray-50 px-4 py-12 text-gray-900 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
      <div class="mx-auto max-w-5xl">
        <Link
          to={props.homeHref ?? "/"}
          class="mb-8 inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900 sm:mb-10"
        >
          ← Back to homepage
        </Link>
        <section class="mb-14 rounded-2xl border border-gray-200 bg-white px-8 py-12 shadow-sm sm:mb-20 sm:px-16 sm:py-14 lg:mb-24 lg:px-20 lg:py-16">
          <article class="markdown-body" innerHTML={props.html()} />
        </section>
      </div>
    </main>
  )
}
