import { createFileRoute } from "@tanstack/solid-router"
import { SiteFrame } from "../components/SiteFrame"
import { seoHeadCreate } from "../seo/seoHeadCreate"

export const Route = createFileRoute("/kontakt")({
  head: () => seoHeadCreate("/kontakt"),
  component: ContactPage,
})

function ContactPage() {
  return (
    <SiteFrame>
      <main class="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <h1 class="text-4xl font-bold tracking-tight">Kontakt</h1>
        <p class="mt-5 max-w-2xl text-lg text-slate-600">Informationen und Kontaktmöglichkeiten werden hier ergänzt.</p>
      </main>
    </SiteFrame>
  )
}
