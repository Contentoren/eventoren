import { createFileRoute } from "@tanstack/solid-router"
import { abiballShopHtmlResponseCreate } from "../abiball/abiballShopHtmlResponseCreate.ts"

export const Route = createFileRoute("/abiball-2027")({
  server: {
    handlers: {
      GET: async () => {
        const { default: shopHtml } = await import("../../public/abiball-2027.html?raw")
        return abiballShopHtmlResponseCreate(shopHtml)
      },
    },
  },
  component: () => null,
})
