import { createFileRoute } from "@tanstack/solid-router"
import { seoHeadCreate } from "../seo/seoHeadCreate"

export const Route = createFileRoute("/")({
  head: () => seoHeadCreate("/"),
  component: HomePage,
})

function HomePage() {
  return <main class="flex min-h-screen items-center justify-center">Hallo - Eventoren</main>
}
