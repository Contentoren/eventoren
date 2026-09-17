import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { Suspense } from "solid-js"
import { HydrationScript } from "solid-js/web"
import { logoutMarkerConsumeStateCreate } from "#src/auth/ui/logoutMarkerConsumeStateCreate.ts"
import { ErrorPage } from "#ui/static/pages/ErrorPage.jsx"
import { rootDocumentStateCreate } from "../app/i18n/rootDocumentStateCreate.ts"
import { seo } from "../lib/seo.js"
import { NotFoundPage } from "../marketing/NotFoundPage.js"
import { RootFooter } from "../marketing/RootFooter.js"
import appCss from "../tailwind.css?url"

const siteName = "eventoren"
const speculationRules = JSON.stringify({
  prerender: [{ where: { href_matches: "/*" }, eagerness: "moderate" }],
})

export const Route = createRootRoute({
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
  logoutMarkerConsumeStateCreate()

  return (
    <>
      <Outlet />
    </>
  )
}

function RootErrorPage() {
  return (
    <ErrorPage title="Something went wrong" subtitle="Please try again later.">
      <Link
        to="/"
        class="mt-6 inline-flex rounded-control bg-brand px-space-4 py-space-2 text-sm font-semibold text-brand-content hover:bg-brand-strong"
      >
        Back home
      </Link>
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
