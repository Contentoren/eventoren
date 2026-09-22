import { createFileRoute, Link, Outlet, redirect } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { Show } from "solid-js"
import { eventorenAdminAccessRead } from "#src/auth/server/eventorenAdminAccessRead.ts"
import { ErrorPage } from "#ui/static/pages/ErrorPage.jsx"
import { AdminShell } from "../admin/AdminShell.tsx"
import { type AdminRouteLoaderData, adminRouteLoaderResolve } from "../admin/adminRouteLoaderResolve.ts"
import { adminRouteText } from "../admin/adminRouteText.ts"
import { ErrorPageActions } from "../components/ErrorPageActions.tsx"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"
import { catalogEventsAdminGet } from "../server/catalogEventsAdminGet.ts"

const getCatalogEvents = createServerFn({ method: "GET" }).handler(catalogEventsAdminGet)
const getAdminAccess = createServerFn({ method: "GET" }).handler(eventorenAdminAccessRead)

export const Route = createFileRoute("/admin")({
  head: () => ({
    ...seoHeadCreate("/"),
    meta: [...seoHeadCreate("/").meta, { name: "robots", content: "noindex, nofollow" }],
  }),
  loader: () =>
    adminRouteLoaderResolve({
      getAdminAccess,
      getCatalogEvents,
      redirect,
    }),
  component: () => {
    const loaderData = Route.useLoaderData()
    const text = adminRouteText()
    return (
      <Show
        when={
          loaderData().authorized
            ? (loaderData() as Extract<
                AdminRouteLoaderData<Awaited<ReturnType<typeof getCatalogEvents>>>,
                { authorized: true }
              >)
            : undefined
        }
        fallback={
          <ErrorPage title={text.accessDeniedTitle} subtitle={text.accessDeniedSubtitle}>
            <ErrorPageActions showSignOut={true}>
              <Link
                to="/"
                class="inline-flex rounded-control bg-brand px-space-4 py-space-2 text-sm font-semibold text-brand-content hover:bg-brand-strong"
              >
                {text.backToHome}
              </Link>
            </ErrorPageActions>
          </ErrorPage>
        }
      >
        <AdminShell>
          <Outlet />
        </AdminShell>
      </Show>
    )
  },
})
