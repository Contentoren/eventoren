import { SiteFooter } from "./SiteFooter"
import { SiteHeader } from "./SiteHeader"

export function LegalMarkdownPage(props: { html: string; title: string }) {
  return (
    <div class="min-h-screen bg-surface-base text-content">
      <SiteHeader />
      <main id="content" tabindex="-1" class="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h1 class="text-4xl font-bold tracking-tight">{props.title}</h1>
        <div class="markdown-body mt-10" innerHTML={props.html} />
      </main>
      <SiteFooter />
    </div>
  )
}
