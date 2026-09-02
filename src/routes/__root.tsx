import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { Suspense } from "solid-js"
import { HydrationScript } from "solid-js/web"
import { NotFoundPage } from "../components/NotFoundPage"
import { seoHeadCreate } from "../seo/seoHeadCreate"
import appCss from "../tailwind.css?url"
import { ThemeProvider } from "../theme/ThemeProvider.tsx"
import { themeModeStorageKey } from "../theme/themeModeStorageKey.ts"

const speculationRules = JSON.stringify({
  prerender: [{ where: { href_matches: "/*" }, eagerness: "moderate" }],
})

const themeInitScript = `(() => {
  const root = document.documentElement
  root.classList.remove("dark")
  root.classList.add("light")
  root.dataset.theme = "light"
  root.style.colorScheme = "light"
  try {
    window.localStorage.removeItem(${JSON.stringify(themeModeStorageKey)})
  } catch {}
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#f8fafc")
})()`

export const Route = createRootRoute({
  head: () => {
    const head = seoHeadCreate("/")
    return {
      ...head,
      links: [
        ...head.links,
        { rel: "icon", type: "image/png", href: "/favicon-32x32.png", sizes: "32x32" },
        { rel: "icon", type: "image/png", href: "/favicon-192x192.png", sizes: "192x192" },
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
  return (
    <ThemeProvider>
      <Outlet />
    </ThemeProvider>
  )
}

function RootDocument(props: { children: JSX.Element }) {
  return (
    <html lang="de">
      <head>
        <HydrationScript />
        <script innerHTML={themeInitScript} />
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
