import { createFileRoute, redirect } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { eventorenCurrentUserRead } from "#src/auth/server/eventorenCurrentUserRead.ts"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"
import { TicketOrderHistoryPage } from "../ticketing/TicketOrderHistoryPage.tsx"

const getCurrentUser = createServerFn({ method: "GET" }).handler(eventorenCurrentUserRead)

export const Route = createFileRoute("/bestellungen")({
  head: () => ({
    ...seoHeadCreate("/bestellungen"),
    meta: [...seoHeadCreate("/bestellungen").meta, { name: "robots", content: "noindex, nofollow" }],
  }),
  loader: async () => {
    const result = await getCurrentUser()
    if (!result.success || !result.data) throw redirect({ to: "/sign-in", search: { returnTo: "/bestellungen" } })
    return { isServerAuthorized: true }
  },
  component: TicketOrderHistoryPage,
})
