import { Show } from "solid-js"
import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import { mdiCalendarPlus } from "@adaptive-ds/mdi/mdiCalendarPlus.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { dashActiveOrg } from "../../dash/store/dashActiveOrg.ts"
import { dashActiveRole } from "../../dash/store/dashActiveRole.ts"
import { dashNow } from "../../dash/store/dashNow.ts"
import { dashOrgEvents } from "../../dash/store/dashOrgEvents.ts"
import { dashSessionUser } from "../../dash/store/dashSessionUser.ts"
import { DashPageHeader } from "../../dash/ui/DashPageHeader.tsx"
import { DashOverviewPage, dashOverviewZeitraumParse } from "../../dash/pages/overview/ui/DashOverviewPage.tsx"
import { dashSearchNumericString } from "../../dash/model/dashSearchNumericString.ts"
import { OverviewStateCreate, type OverviewZeitraum } from "../../dash/pages/overview/OverviewStateCreate.ts"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"

const dashboardZeitraeume = ["7", "30", "365"] as const

type DashboardZeitraum = (typeof dashboardZeitraeume)[number]
type DashboardZeitraumZahl = 7 | 30 | 365

const RouteApi = createFileRoute("/demo/dashboard/")({
  validateSearch: (input: unknown): { zeitraum?: DashboardZeitraum | DashboardZeitraumZahl } => {
    const zeitraum = dashSearchNumericString(
      ((input ?? {}) as Record<string, unknown>)["zeitraum"],
      dashboardZeitraeume,
    )
    if (zeitraum === undefined) return {}
    return { zeitraum: Number(zeitraum) as DashboardZeitraumZahl }
  },
  head: () => demoRouteHeadCreate("Übersicht · Eventoren Demo", "Kennzahlen und nächste Events.", "/demo/dashboard"),
  component: DashboardOverviewRoute,
})

export const Route = RouteApi

function firstNameOf(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0]
  return first && first.length > 0 ? first : fullName
}

function DashboardOverviewRoute() {
  const search = RouteApi.useSearch()
  const navigate = useNavigate()
  const zeitraum = (): OverviewZeitraum => dashOverviewZeitraumParse(search().zeitraum)
  const state = OverviewStateCreate(zeitraum())
  const applyZeitraum = (value: string) => {
    const parsed = dashOverviewZeitraumParse(value)
    state.setZeitraum(parsed)
    void navigate({
      to: "/demo/dashboard",
      search: { zeitraum: parsed },
      replace: true,
    })
  }

  const org = () => dashActiveOrg()
  const user = () => dashSessionUser()
  const role = () => dashActiveRole()
  const now = dashNow()
  const events = () => {
    const active = org()
    return active ? dashOrgEvents(active.id) : []
  }
  const isEinlass = () => role() === "einlass"

  const greeting = () => {
    const name = user()
    return name ? `Hallo ${firstNameOf(name.name)}` : "Hallo"
  }
  const todayLabel = () => {
    const current = now()
    const parts = new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).formatToParts(current)
    const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? ""
    return `${part("weekday")}, ${part("day")}. ${part("month")} ${part("year")}`
  }

  return (
    <div>
      <DashPageHeader
        title={greeting()}
        description={todayLabel()}
        actions={
          <span class="flex flex-wrap items-center gap-2">
            <SegmentedControl
              value={String(state.zeitraum())}
              onChange={applyZeitraum}
              options={[
                { value: "7", label: "7 Tage" },
                { value: "30", label: "30 Tage" },
                { value: "365", label: "12 Monate" },
              ]}
              ariaLabel="Zeitraum wählen"
              size="sm"
            />
            <Show when={!isEinlass()}>
              <LinkButtonInternal
                to="/demo/dashboard/events/neu"
                variant="contrast"
                icon={mdiPlus}
                class="h-9 gap-1.5 px-3 text-sm"
              >
                Event erstellen
              </LinkButtonInternal>
            </Show>
          </span>
        }
      />
      <Show
        when={events().length > 0}
        fallback={
          <div class="rounded-card border border-border-subtle bg-surface p-6 text-center">
            <EmptyState
              icon={mdiCalendarPlus}
              title="Erstelle dein erstes Event"
              description="Lege dein erstes Event an und starte den Verkauf."
              actions={
                <span class="flex flex-wrap justify-center gap-2">
                  <LinkButtonInternal
                    to="/demo/dashboard/events/neu"
                    variant="contrast"
                    icon={mdiPlus}
                    class="h-9 gap-1.5 px-3 text-sm"
                  >
                    Event erstellen
                  </LinkButtonInternal>
                  <LinkButtonInternal
                    to="/demo/dashboard/events/neu"
                    search={{ vorlage: "1" }}
                    variant="outline"
                    class="h-9 gap-1.5 px-3 text-sm"
                  >
                    Aus Vorlage
                  </LinkButtonInternal>
                </span>
              }
            />
          </div>
        }
      >
        <DashOverviewPage state={state} />
      </Show>
    </div>
  )
}
