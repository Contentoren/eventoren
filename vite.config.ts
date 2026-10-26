import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/solid-start/plugin/vite"
import { solidAiSrcPlugin } from "ai-src/solid"
import { defineConfig, type Plugin } from "vite"
import solid from "vite-plugin-solid"
import { seo } from "./src/lib/seo.js"
import type { ContentEntry } from "./src/app/content/contentList.js"
import { allContent, isPublishedAtBuild } from "./src/app/content/contentList.js"

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
