import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { Suspense } from "solid-js"
import { HydrationScript } from "solid-js/web"
import { NotFoundPage } from "../components/NotFoundPage"
import { seoHeadCreate } from "../seo/seoHeadCreate"
import appCss from "../tailwind.css?url"

const speculationRules = JSON.stringify({
  prerender: [{ where: { href_matches: "/*" }, eagerness: "moderate" }],
})

export const Route = createRootRoute({
  head: () => {
    const head = seoHeadCreate("/")
    return {
      ...head,
      links: [
        ...head.links,
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico", sizes: "32x32" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
        { rel: "manifest", href: "/site.webmanifest" },
        { rel: "stylesheet", href: appCss },
      ],
    }
  },
  component: RootOutlet,
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
})

function RootOutlet() {
  return <Outlet />
}

function RootDocument(props: { children: JSX.Element }) {
  return (
    <html lang="de">
      <head>
        <HydrationScript />
        <HeadContent />
        <script type="speculationrules" innerHTML={speculationRules} />
      </head>
      <body>
        <Suspense>{props.children}</Suspense>
        <Scripts />
      </body>
    </html>
  )
}
