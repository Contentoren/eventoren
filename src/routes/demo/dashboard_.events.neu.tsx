import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DashShellSkeleton } from "../../dash/ui/shell/DashShellSkeleton.tsx"
import { dashSearchNumericString } from "../../dash/model/dashSearchNumericString.ts"
import { DashWizardPage } from "../../dash/pages/wizard/ui/DashWizardPage.tsx"

const wizardSchritte = ["1", "2", "3"] as const

type WizardSchritt = (typeof wizardSchritte)[number]
type WizardSchrittZahl = 1 | 2 | 3

function dashWizardStepParse(raw: unknown): number {
  const schritt = dashSearchNumericString(raw, wizardSchritte)
  if (schritt === "2") return 1
  if (schritt === "3") return 2
  return 0
}

export const Route = createFileRoute("/demo/dashboard_/events/neu")({
  validateSearch: (input: unknown): { schritt?: WizardSchritt | WizardSchrittZahl; vorlage?: string } => {
    const raw = (input ?? {}) as Record<string, unknown>
    const output: { schritt?: WizardSchritt | WizardSchrittZahl; vorlage?: string } = {}
    const schritt = dashSearchNumericString(raw["schritt"], wizardSchritte)
    if (schritt !== undefined) output.schritt = Number(schritt) as WizardSchrittZahl
    if (typeof raw["vorlage"] === "string") output.vorlage = raw["vorlage"]
    return output
  },
  head: () =>
    demoRouteHeadCreate(
      "Event erstellen · Eventoren Demo",
      "Neues Event in drei Schritten.",
      "/demo/dashboard/events/neu",
    ),
  component: () => (
    <ClientOnly fallback={<DashShellSkeleton />}>
      <DashWizardRoute />
    </ClientOnly>
  ),
})

function DashWizardRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const step = () => dashWizardStepParse(search().schritt)

  return (
    <DashWizardPage
      step={step}
      vorlage={() => search().vorlage}
      onStep={(next) =>
        navigate({
          to: "/demo/dashboard/events/neu",
          search: (previous) => ({
            ...(previous as Record<string, unknown>),
            schritt: next + 1,
          }),
          replace: true,
        })
      }
    />
  )
}
