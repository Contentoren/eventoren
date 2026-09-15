import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../../demo/model/demoRouteHeadCreate.ts"
import { DemoSignIn } from "../../../demo/ui/DemoSignIn.tsx"

export const Route = createFileRoute("/demo/auth/sign-in")({
  head: () => demoRouteHeadCreate("Sign-in demo", "Review a local sign-in workflow.", "/demo/auth/sign-in"),
  component: DemoSignIn,
})
