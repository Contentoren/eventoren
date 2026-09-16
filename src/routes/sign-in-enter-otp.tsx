import { createFileRoute } from "@tanstack/solid-router"
import { SignInEnterOtpPage } from "#src/auth/ui/SignInEnterOtpPage.tsx"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { signInEnterOtpSearchParse } from "./-signInEnterOtpSearchParse.ts"

export const Route = createFileRoute("/sign-in-enter-otp")({
  validateSearch: signInEnterOtpSearchParse,
  component: () => {
    const search = Route.useSearch()()
    return (
      <SiteFrame>
        <SignInEnterOtpPage initialEmail={search.email} initialCode={search.code} returnTo={search.returnTo} />
      </SiteFrame>
    )
  },
})
