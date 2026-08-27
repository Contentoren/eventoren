import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/solid-start/plugin/vite"
import { solidAiSrcPlugin } from "ai-src/solid"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import { seoPages } from "./src/seo/seoPages.ts"
import { seoSiteUrl } from "./src/seo/seoSiteUrl.ts"

const allowedHosts = ["eventoren.leonardomora.de", "localhost"]

export default defineConfig({
  server: {
    port: 3040,
    strictPort: true,
    host: true,
    allowedHosts,
  },
  preview: {
    port: 3040,
    strictPort: true,
    host: true,
    allowedHosts,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
      router: {
        quoteStyle: "double",
        semicolons: false,
        routesDirectory: "routes",
      },
      prerender: {
        enabled: true,
        crawlLinks: false,
        autoSubfolderIndex: false,
      },
      sitemap: {
        enabled: true,
        host: seoSiteUrl,
      },
      pages: seoPages.map((page) => ({
        path: page.path,
        sitemap: {
          priority: page.priority,
          changefreq: page.changefreq,
        },
      })),
    }),
    solidAiSrcPlugin(),
    solid({ ssr: true }),
  ],
  build: {
    target: "esnext",
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
})
