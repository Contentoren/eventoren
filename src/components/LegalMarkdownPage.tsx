import { SiteFooter } from "./SiteFooter"
import { SiteHeader } from "./SiteHeader"

export function LegalMarkdownPage(props: { html: string; title: string }) {
  return (
    <div class="min-h-screen bg-white text-slate-950">
      <SiteHeader />
      <main class="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h1 class="text-4xl font-bold tracking-tight">{props.title}</h1>
        <div class="markdown-body mt-10" innerHTML={props.html} />
      </main>
      <SiteFooter />
    </div>
  )
}
