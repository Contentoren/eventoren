import { createFileRoute, redirect } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { AdminCatalogPage } from "../admin/AdminCatalogPage.tsx"
import { eventorenAdminAccessRead } from "#src/auth/server/eventorenAdminAccessRead.ts"
import { catalogEventsPublicGet } from "../server/catalogEventsPublicGet.js"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"

const getCatalogEvents = createServerFn({ method: "GET" }).handler(catalogEventsPublicGet)
const getAdminAccess = createServerFn({ method: "GET" }).handler(eventorenAdminAccessRead)

export const Route = createFileRoute("/admin")({
  head: () => ({
    ...seoHeadCreate("/"),
    meta: [...seoHeadCreate("/").meta, { name: "robots", content: "noindex, nofollow" }],
  }),
  loader: async () => {
    const accessResult = await getAdminAccess()
    if (!accessResult.success) {
      if (accessResult.errorMessage === "Eventoren-Adminrolle erforderlich") throw redirect({ to: "/" })
      throw redirect({ to: "/sign-in", search: { returnTo: "/admin" } })
    }
    return {
      eventsResult: await getCatalogEvents(),
      isServerAuthorized: true,
    }
  },
  component: () => {
    const loaderData = Route.useLoaderData()
    return (
      <AdminCatalogPage
        eventsResult={() => loaderData().eventsResult}
        isServerAuthorized={() => loaderData().isServerAuthorized}
      />
    )
  },
})
