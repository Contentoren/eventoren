import { createRootRoute, HeadContent, Link, Outlet, Scripts, useLocation } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { Suspense } from "solid-js"
import { HydrationScript } from "solid-js/web"
import { createResult } from "#result"
import { eventorenCurrentUserServerFn } from "#src/auth/server/eventorenCurrentUserServerFn.ts"
import { EventorenAuthProvider } from "#src/auth/ui/EventorenAuthProvider.tsx"
import { ErrorPage } from "#ui/static/pages/ErrorPage.jsx"
import { rootDocumentStateCreate } from "../app/i18n/rootDocumentStateCreate.ts"
import { ErrorPageActions } from "../components/ErrorPageActions.tsx"
import { seo } from "../lib/seo.js"
import { NotFoundPage } from "../marketing/NotFoundPage.js"
import { RootFooter } from "../marketing/RootFooter.js"
import appCss from "../tailwind.css?url"
import { speculationRules } from "./speculationRules.ts"

const siteName = "eventoren"

export const Route = createRootRoute({
  loader: async ({ location }) => {
    if (isDemoPath(location.pathname)) return createResult(null)
    return eventorenCurrentUserServerFn()
  },
  head: () => ({
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#ffffff" },
      ...seo.pageMeta({ title: siteName, path: "/" }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(seo.websiteJsonLd()) },
      { type: "application/ld+json", children: JSON.stringify(seo.softwareSourceCodeJsonLd()) },
    ],
  }),
  component: PublicRootContent,
  errorComponent: RootErrorPage,
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
})

function PublicRootContent() {
  const initialIdentityResult = Route.useLoaderData()
  const location = useLocation()
  const isDemo = () => isDemoPath(location().pathname)

  return (
    <EventorenAuthProvider initialIdentityResult={initialIdentityResult} isDemo={isDemo}>
      <Outlet />
    </EventorenAuthProvider>
  )
}

function isDemoPath(pathname: string) {
  return pathname === "/demo" || pathname.startsWith("/demo/")
}

function RootErrorPage() {
  return (
    <ErrorPage title="Etwas ist schiefgelaufen" subtitle="Bitte versuchen Sie es später erneut.">
      <ErrorPageActions>
        <Link
          to="/"
          class="inline-flex rounded-control bg-brand px-space-4 py-space-2 text-sm font-semibold text-brand-content hover:bg-brand-strong"
        >
          Zurück zur Startseite
        </Link>
      </ErrorPageActions>
    </ErrorPage>
  )
}

function RootDocument(props: { children: JSX.Element }) {
  const state = rootDocumentStateCreate()

  return (
    <html lang={state.language()}>
      <head>
        <HydrationScript />
        <script type="speculationrules" innerHTML={speculationRules} />
        <HeadContent />
      </head>
      <body class="min-h-dvh">
        <div>
          <Suspense>{props.children}</Suspense>
        </div>
        <RootFooter />
        <Scripts />
      </body>
    </html>
  )
}
