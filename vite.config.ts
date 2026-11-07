import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/solid-start/plugin/vite"
import { solidAiSrcPlugin } from "ai-src/solid"
import { defineConfig, type Plugin } from "vite"
import solid from "vite-plugin-solid"
import { contentStaticPageList } from "./src/app/content/contentStaticPageList.ts"
import { contentStaticPathIs } from "./src/app/content/contentStaticPathIs.ts"

const devNoindexHeaderName = "X-Robots-Tag"
const devNoindexHeaderValue = "noindex"

// Vite's `server.headers` only covers responses Vite serves itself, so the
// framework SSR responses of the preview host need the same header through a
// middleware. Dev server only: production builds keep their own headers.
const devNoindexHeadersPlugin = (): Plugin => ({
  name: "eventoren:dev-noindex-headers",
  configureServer(server) {
    server.middlewares.use((_request, response, next) => {
      response.setHeader(devNoindexHeaderName, devNoindexHeaderValue)
      next()
    })
  },
})

export default defineConfig({
  envPrefix: ["VITE_", "PUBLIC_"],
  plugins: [
    devNoindexHeadersPlugin(),
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
      router: {
        quoteStyle: "double",
        semicolons: false,
        routesDirectory: "routes",
      },
      // Only the Ratgeber/Guides hubs and published articles are static. Everything else stays
      // request-time SSR, so no route discovery, no link crawling and never a `/` (index.html).
      // `autoSubfolderIndex: false` writes `ratgeber/<slug>.html`, which Pages serves at the
      // canonical extensionless URL without a trailing-slash redirect.
      pages: contentStaticPageList(),
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: false,
        crawlLinks: false,
        autoSubfolderIndex: false,
        failOnError: true,
        filter: (page) => contentStaticPathIs(page.path),
      },
      sitemap: { enabled: false },
    }),
    solidAiSrcPlugin(),
    solid({ ssr: true }),
  ],
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
  ssr: {
    noExternal: [/^@corvu\//],
  },
  server: {
    allowedHosts: ["eventoren.wonder1.de"],
    headers: {
      [devNoindexHeaderName]: devNoindexHeaderValue,
    },
  },
})
