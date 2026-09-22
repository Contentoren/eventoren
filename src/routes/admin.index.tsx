import { createFileRoute, redirect } from "@tanstack/solid-router"

export const Route = createFileRoute("/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/bestellungen" })
  },
})
