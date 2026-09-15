import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../../demo/model/demoRouteHeadCreate.ts"
import { DemoSignInOtp } from "../../../demo/ui/DemoSignInOtp.tsx"

export const Route = createFileRoute("/demo/auth/otp-error")({
  head: () => demoRouteHeadCreate("OTP error demo", "Review the one-time-code error state.", "/demo/auth/otp-error"),
  component: () => <DemoSignInOtp error />,
})
