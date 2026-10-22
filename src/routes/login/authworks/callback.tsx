import { createFileRoute } from "@tanstack/solid-router"
import { eventorenAuthworks } from "#src/auth/server/eventorenAuthworks.ts"

export const Route = createFileRoute("/login/authworks/callback")({
  server: {
    handlers: {
      GET: ({ request }) => eventorenAuthworks.loginComplete(request),
    },
  },
  component: () => null,
})
