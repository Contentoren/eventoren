import { createFileRoute } from "@tanstack/solid-router"
import { eventorenZitadel } from "#src/auth/server/eventorenZitadel.ts"

export const Route = createFileRoute("/login/zitadel/callback")({
  server: {
    handlers: {
      GET: ({ request }) => eventorenZitadel.loginComplete(request),
    },
  },
  component: () => null,
})
