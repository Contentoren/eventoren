import { createFileRoute } from "@tanstack/solid-router"
import { SignInEnterOtpPage } from "#src/auth/ui/SignInEnterOtpPage.tsx"
import { signInEnterOtpSearchParse } from "./-signInEnterOtpSearchParse.ts"

export const Route = createFileRoute("/sign-in-enter-otp")({
  validateSearch: signInEnterOtpSearchParse,
  component: () => {
    const search = Route.useSearch()()
    return <SignInEnterOtpPage initialEmail={search.email} initialCode={search.code} returnTo={search.returnTo} />
  },
})
