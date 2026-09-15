import { SiteFrame } from "./SiteFrame.tsx"

export function LegalMarkdownPage(props: { html: string; title: string }) {
  return (
    <SiteFrame>
      <main id="content" tabindex="-1" class="mx-auto w-full max-w-3xl px-6 py-16 md:py-24">
        <h1 class="text-4xl font-bold tracking-tight">{props.title}</h1>
        <div class="markdown-body mt-10" innerHTML={props.html} />
      </main>
    </SiteFrame>
  )
}
