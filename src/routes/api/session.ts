import { createFileRoute } from "@tanstack/solid-router"
import { eventorenBrowserSessionRead } from "#src/auth/server/eventorenBrowserSessionRead.ts"

export const Route = createFileRoute("/api/session")({
  server: {
    handlers: {
      GET: async () => {
        const result = await eventorenBrowserSessionRead()
        const headers = new Headers({ "cache-control": "no-store", "content-type": "application/json" })
        if (!result.success)
          return new Response(JSON.stringify({ error: result.errorMessage }), { status: 503, headers })
        return new Response(JSON.stringify({ session: result.data }), { status: 200, headers })
      },
    },
  },
  component: () => null,
})
