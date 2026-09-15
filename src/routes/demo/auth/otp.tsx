import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../../demo/model/demoRouteHeadCreate.ts"
import { DemoSignInOtp } from "../../../demo/ui/DemoSignInOtp.tsx"

export const Route = createFileRoute("/demo/auth/otp")({
  head: () => demoRouteHeadCreate("OTP sign-in demo", "Review a local one-time-code workflow.", "/demo/auth/otp"),
  component: DemoSignInOtp,
})
