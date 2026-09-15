import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../../demo/model/demoRouteHeadCreate.ts"
import { DemoSignIn } from "../../../demo/ui/DemoSignIn.tsx"

export const Route = createFileRoute("/demo/auth/sign-in-error")({
  head: () => demoRouteHeadCreate("Sign-in error demo", "Review the sign-in error state.", "/demo/auth/sign-in-error"),
  component: () => <DemoSignIn error />,
})
