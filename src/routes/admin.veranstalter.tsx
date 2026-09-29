import { createFileRoute, redirect } from "@tanstack/solid-router"
import { adminVeranstalterRedirectOptionsResolve } from "./-adminVeranstalterRedirectOptionsResolve.ts"

export const Route = createFileRoute("/admin/veranstalter")({
  beforeLoad: () => {
    throw redirect(adminVeranstalterRedirectOptionsResolve())
  },
  component: () => null,
})
