import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { Match, Switch } from "solid-js"
import { veranstalterDashboardPageStateCreate } from "../organizer/dashboard/client/veranstalterDashboardPageStateCreate.ts"
import { veranstalterDashboardSearchParse } from "../organizer/dashboard/client/veranstalterDashboardSearchParse.ts"
import { VeranstalterDashboardErrorState } from "../organizer/dashboard/ui/VeranstalterDashboardErrorState.tsx"
import { VeranstalterDashboardLoadingState } from "../organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardLoginState } from "../organizer/dashboard/ui/VeranstalterDashboardLoginState.tsx"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"
import { VeranstalterOnboardingPage } from "../organizer/dashboard/pages/organization/ui/VeranstalterOnboardingPage.tsx"

export const Route = createFileRoute("/veranstalter_/onboarding")({
  validateSearch: (input: unknown) => veranstalterDashboardSearchParse(input),
  head: () => ({
    ...seoHeadCreate("/veranstalter/onboarding", { noindex: true }),
  }),
  component: () => (
    <ClientOnly fallback={<VeranstalterOnboardingFallback />}>
      <VeranstalterOnboardingRoute />
    </ClientOnly>
  ),
})

function VeranstalterOnboardingFallback() {
  return (
    <div class="flex min-h-dvh items-center justify-center bg-surface-base px-4" aria-hidden="true">
      <div class="w-full max-w-[720px]">
        <VeranstalterDashboardLoadingState />
      </div>
    </div>
  )
}

function VeranstalterOnboardingRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const page = veranstalterDashboardPageStateCreate({
    orgId: () => search().org,
    selectOrganization: (organizationId) =>
      void navigate({ to: "/veranstalter/onboarding", search: { org: organizationId }, replace: true }),
  })
  const view = () => page.shell.view()
  return (
    <div class="min-h-dvh bg-surface-base text-content">
      <div class="mx-auto flex min-h-dvh w-full max-w-[1120px] flex-col px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <p class="text-lg font-bold tracking-tight text-content" aria-label="eventoren">
          eventoren
        </p>
        <p class="mt-1 text-xs text-content-muted">Dein Weg zum ersten Event.</p>
        <main class="mx-auto flex w-full max-w-[720px] flex-1 flex-col py-6">
          <Switch>
            <Match when={view() === "loading"}>
              <VeranstalterDashboardLoadingState />
            </Match>
            <Match when={view() === "login"}>
              <VeranstalterDashboardLoginState />
            </Match>
            <Match when={view() === "error"}>
              <VeranstalterDashboardErrorState state={page.shell} />
            </Match>
            <Match when={true}>
              <VeranstalterOnboardingPage />
            </Match>
          </Switch>
        </main>
      </div>
    </div>
  )
}
