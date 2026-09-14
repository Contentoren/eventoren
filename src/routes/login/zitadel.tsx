import { createFileRoute } from "@tanstack/solid-router"
import { eventorenZitadel } from "#src/auth/server/eventorenZitadel.ts"

export const Route = createFileRoute("/login/zitadel")({
  server: {
    handlers: {
      GET: ({ request }) => eventorenZitadel.loginStart(request),
    },
  },
  component: () => null,
})
