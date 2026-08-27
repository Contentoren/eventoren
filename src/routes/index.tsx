import { createFileRoute } from "@tanstack/solid-router"
import { seoHeadCreate } from "../seo/seoHeadCreate"

export const Route = createFileRoute("/")({
  head: () => seoHeadCreate("/"),
  component: HomePage,
})

function HomePage() {
  return (
    <main class="min-h-screen p-8">
      <h1 class="text-3xl font-bold">Eventoren</h1>
      <p class="mt-4 max-w-2xl text-lg text-slate-600">Veranstaltungen, Termine und Erlebnisse an einem Ort.</p>
    </main>
  )
}
