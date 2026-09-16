import { createFileRoute } from "@tanstack/solid-router"
import { SignInPage } from "#src/auth/ui/SignInPage.tsx"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { signInSearchParse } from "./-signInSearchParse.ts"

export const Route = createFileRoute("/sign-in")({
  validateSearch: signInSearchParse,
  component: () => (
    <SiteFrame>
      <SignInPage returnTo={Route.useSearch()().returnTo} />
    </SiteFrame>
  ),
})
