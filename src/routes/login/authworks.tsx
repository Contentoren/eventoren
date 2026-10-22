import { createFileRoute } from "@tanstack/solid-router"
import { eventorenAuthworks } from "#src/auth/server/eventorenAuthworks.ts"

export const Route = createFileRoute("/login/authworks")({
  server: {
    handlers: {
      GET: ({ request }) => eventorenAuthworks.loginStart(request),
    },
  },
  component: () => null,
})
