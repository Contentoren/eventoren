import { createFileRoute } from "@tanstack/solid-router"
import { SignInPage } from "#src/auth/ui/SignInPage.tsx"
import { signInSearchParse } from "./-signInSearchParse.ts"

export const Route = createFileRoute("/sign-in")({
  validateSearch: signInSearchParse,
  component: () => <SignInPage returnTo={Route.useSearch()().returnTo} />,
})
