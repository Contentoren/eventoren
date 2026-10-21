import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { KundenkontoPage } from "#src/customer/account/KundenkontoPage.tsx"
import { kundenkontoSearchParse } from "#src/customer/account/kundenkontoSearchParse.ts"

export const Route = createFileRoute("/konto")({
  validateSearch: kundenkontoSearchParse,
  head: () => ({
    meta: [{ title: "Mein Konto | Eventoren" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AccountRoute,
})
function AccountRoute() {
  const search = Route.useSearch(),
    navigate = Route.useNavigate()
  return (
    <ClientOnly fallback={<main class="p-4">Konto wird geladen …</main>}>
      <KundenkontoPage search={search} changeSearch={(search) => void navigate({ search, replace: true })} />
    </ClientOnly>
  )
}
