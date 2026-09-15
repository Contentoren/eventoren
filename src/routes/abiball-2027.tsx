import { createFileRoute } from "@tanstack/solid-router"

export const Route = createFileRoute("/abiball-2027")({
  server: {
    handlers: {
      GET: ({ request }) => Response.redirect(new URL("/abiball-2027.html", request.url), 308),
    },
  },
  component: () => null,
})
