import { createFileRoute, redirect } from "@tanstack/solid-router"
import { signInSearchParse } from "./-signInSearchParse.ts"

export const Route = createFileRoute("/sign-in")({
  validateSearch: signInSearchParse,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/sso",
      ...(search.returnTo ? { search: { returnTo: search.returnTo } } : {}),
    })
  },
  component: () => null,
})
