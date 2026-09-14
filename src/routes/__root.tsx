import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { Suspense } from "solid-js"
import { HydrationScript } from "solid-js/web"
import { seo } from "../lib/seo.js"
import appCss from "../tailwind.css?url"
import { NotFoundPage } from "../marketing/NotFoundPage.js"
import { Footer } from "../marketing/Footer.js"
import { Header } from "../marketing/Header.js"
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
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico", sizes: "any" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(seo.websiteJsonLd()) },
      { type: "application/ld+json", children: JSON.stringify(seo.softwareSourceCodeJsonLd()) },
    ],
  }),
  component: PublicRootContent,
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
})

function PublicRootContent() {
  return (
    <>
      <Outlet />
    </>
  )
}

function RootDocument(props: { children: JSX.Element }) {
  return (
    <html lang="de">
      <head>
        <HydrationScript />
        <script type="speculationrules" innerHTML={speculationRules} />
        <HeadContent />
      </head>
      <body class="min-h-dvh">
        <Header />
        <main>
          <Suspense>{props.children}</Suspense>
        </main>
        <Footer />
        <Scripts />
      </body>
    </html>
  )
}
