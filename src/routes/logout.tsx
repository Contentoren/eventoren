import { createFileRoute } from "@tanstack/solid-router"
import { eventorenLogoutResponse } from "#src/auth/server/eventorenLogoutResponse.ts"

export const Route = createFileRoute("/logout")({
  server: {
    handlers: {
      GET: ({ request }) => eventorenLogoutResponse(request),
      POST: ({ request }) => eventorenLogoutResponse(request),
    },
  },
  component: () => null,
})
