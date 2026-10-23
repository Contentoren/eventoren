import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { Match, Switch } from "solid-js"
import { veranstalterDashboardPageStateCreate } from "../organizer/dashboard/client/veranstalterDashboardPageStateCreate.ts"
import { veranstalterDashboardSearchParse } from "../organizer/dashboard/client/veranstalterDashboardSearchParse.ts"
import { VeranstalterDashboardErrorState } from "../organizer/dashboard/ui/VeranstalterDashboardErrorState.tsx"
import { VeranstalterDashboardLoadingState } from "../organizer/dashboard/ui/VeranstalterDashboardLoadingState.tsx"
import { VeranstalterDashboardLoginState } from "../organizer/dashboard/ui/VeranstalterDashboardLoginState.tsx"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"
import { VeranstalterOnboardingPage } from "../organizer/dashboard/pages/organization/ui/VeranstalterOnboardingPage.tsx"
import { OrganizerContractLinks } from "../organizer/dashboard/contracts/OrganizerContractLinks.tsx"
import { OrganizerPricingSummary } from "../organizer/dashboard/contracts/OrganizerPricingSummary.tsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"

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
        <LinkButtonInternal
          to="/"
          class="self-start text-lg font-bold tracking-tight"
          aria-label="Eventoren Startseite"
        >
          eventoren
        </LinkButtonInternal>
        <p class="mt-1 text-xs text-content-muted">Dein Weg zum ersten Event.</p>
        <main class="mx-auto flex w-full max-w-[720px] flex-1 flex-col py-6">
          <Switch>
            <Match when={view() === "loading"}>
              <VeranstalterDashboardLoadingState />
            </Match>
            <Match when={view() === "login"}>
              <div class="flex flex-col gap-5">
                <h1 class="text-xl font-semibold">Als Veranstalter starten</h1>
                <p class="text-sm text-content-muted">
                  Für Unternehmen, Vereine, Schulen und private Veranstalter. Mit der Registrierung legst du ein
                  Veranstalterkonto an – keine neue Firma oder keinen neuen Verein.
                </p>
                <ol class="list-decimal space-y-2 pl-5 text-sm">
                  <li>Anmelden und vollständige Vertragspartner- und Kontaktdaten angeben.</li>
                  <li>Kostenaufteilung wählen und Veranstaltervertrag sowie AVV bestätigen.</li>
                  <li>Bank- und Steuerangaben prüfen lassen; erst nach Freischaltung Tickets verkaufen.</li>
                </ol>
                <OrganizerPricingSummary />
                <OrganizerContractLinks />
                <VeranstalterDashboardLoginState returnTo="/veranstalter/onboarding" />
              </div>
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
