import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/solid-start/plugin/vite"
import { solidAiSrcPlugin } from "ai-src/solid"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import { seo } from "./src/lib/seo.js"
import type { ContentEntry } from "./src/app/content/contentList.js"
import { allContent, isPublishedAtBuild } from "./src/app/content/contentList.js"

export default defineConfig({
  plugins: [
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
  server: {
    allowedHosts: ["eventoren.leonardomora.de"],
  },
})
