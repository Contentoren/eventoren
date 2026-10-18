import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { Skeleton } from "#ui/static/skeleton/Skeleton.jsx"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { dashSearchNumericString } from "../../dash/model/dashSearchNumericString.ts"
import { dashOnboardingPageStateCreate } from "../../dash/pages/onboarding/dashOnboardingPageStateCreate.ts"
import { DashOnboardingPage } from "../../dash/pages/onboarding/ui/DashOnboardingPage.tsx"

const onboardingSchritte = ["1", "2", "3", "4", "5"] as const

type OnboardingSchritt = (typeof onboardingSchritte)[number]
type OnboardingSchrittZahl = 1 | 2 | 3 | 4 | 5

function onboardingStepParse(raw: unknown): number {
  const schritt = dashSearchNumericString(raw, onboardingSchritte)
  if (schritt === "2") return 1
  if (schritt === "3") return 2
  if (schritt === "4") return 3
  if (schritt === "5") return 4
  return 0
}

export const Route = createFileRoute("/demo/onboarding")({
  validateSearch: (input: unknown): { schritt?: OnboardingSchritt | OnboardingSchrittZahl } => {
    const schritt = dashSearchNumericString(((input ?? {}) as Record<string, unknown>)["schritt"], onboardingSchritte)
    if (schritt === undefined) return {}
    return { schritt: Number(schritt) as OnboardingSchrittZahl }
  },
  head: () =>
    demoRouteHeadCreate(
      "Veranstalter-Onboarding-Demo",
      "Lokales Onboarding für Veranstalter: Konto, Organisation, Angaben und Verträge.",
      "/demo/onboarding",
    ),
  component: () => (
    <ClientOnly
      fallback={
        <div class="flex min-h-dvh items-center justify-center bg-surface-base px-4" aria-hidden="true">
          <div class="w-full max-w-[560px] space-y-3">
            <Skeleton class="h-8 w-48" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-64 rounded-card border border-border-subtle" />
          </div>
        </div>
      }
    >
      <OnboardingRoute />
    </ClientOnly>
  ),
})

function OnboardingRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const step = () => onboardingStepParse(search().schritt)

  const state = dashOnboardingPageStateCreate({
    step,
    onStep: (next) =>
      navigate({
        to: "/demo/onboarding",
        search: (previous) => ({
          ...(previous as Record<string, unknown>),
          schritt: next + 1,
        }),
        replace: true,
      }),
  })

  return <DashOnboardingPage state={state} />
}
