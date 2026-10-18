import { createMemo, Show } from "solid-js"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import { dashActiveOrg } from "../../../store/dashActiveOrg.ts"
import { dashActiveRole } from "../../../store/dashActiveRole.ts"
import { dashCan } from "../../../store/dashCan.ts"
import { dashNow } from "../../../store/dashNow.ts"
import { dashOrgEvents } from "../../../store/dashOrgEvents.ts"
import { dashSearchNumericString } from "../../../model/dashSearchNumericString.ts"
import { dashEventStats } from "../../../model/dashEventStats.ts"
import { dashEventPhaseGet } from "../../../model/dashEventPhaseGet.ts"
import { dashOrgStats } from "../../../model/dashOrgStats.ts"
import { OverviewStateCreate, type OverviewZeitraum } from "../OverviewStateCreate.ts"
import { dashOverviewActivityCreate } from "../model/dashOverviewActivityCreate.ts"
import { dashOverviewTodosCreate } from "../model/dashOverviewTodosCreate.ts"
import { DashOverviewTodayCard } from "./DashOverviewTodayCard.tsx"
import { DashOverviewKpis } from "./DashOverviewKpis.tsx"
import { DashOverviewSalesChart } from "./DashOverviewSalesChart.tsx"
import { DashOverviewNextEvents, type DashOverviewEventRow } from "./DashOverviewNextEvents.tsx"
import { DashOverviewActivity } from "./DashOverviewActivity.tsx"
import { DashOverviewTodos } from "./DashOverviewTodos.tsx"

export function dashOverviewZeitraumParse(raw: unknown): OverviewZeitraum {
  const zeitraum = dashSearchNumericString(raw, ["7", "30", "365"])
  if (zeitraum !== undefined) return Number(zeitraum) as OverviewZeitraum
  return 30
}

export function dashOverviewZeitraumLabel(zeitraum: OverviewZeitraum): string {
  if (zeitraum === 7) return "ggü. Vorwoche"
  if (zeitraum === 365) return "ggü. Vorjahr"
  return "ggü. Vormonat"
}

function sameBerlinDay(a: Date, b: Date): boolean {
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" })
  return format.format(a) === format.format(b)
}

export function DashOverviewPage(p: { state: ReturnType<typeof OverviewStateCreate> }) {
  const now = dashNow()
  const dashState = () => dashStateGet()
  const org = () => dashActiveOrg()
  const role = () => dashActiveRole()
  const events = () => {
    const active = org()
    return active ? dashOrgEvents(active.id) : []
  }
  const isEinlass = () => role() === "einlass"
  const showRevenue = () => !isEinlass() && dashCan("umsatz.sehen")

  const stats = createMemo(() => {
    const active = org()
    if (!active) return null
    return dashOrgStats({ state: dashState(), orgId: active.id, range: p.state.zeitraum(), now: now() })
  })

  const todayEvent = () => {
    const current = now()
    return (
      events().find((event) => sameBerlinDay(new Date(event.startsAt), current) && event.status !== "abgesagt") ?? null
    )
  }

  const todayStats = createMemo(() => {
    const event = todayEvent()
    if (!event) return null
    return dashEventStats({ state: dashState(), eventId: event.id, now: now() })
  })

  const nextRows = createMemo((): DashOverviewEventRow[] => {
    const current = now()
    const snapshot = dashState()
    return events()
      .filter((event) => event.status !== "abgesagt" && new Date(event.endsAt) >= current)
      .map((event) => {
        const eventStats = dashEventStats({ state: snapshot, eventId: event.id, now: current })
        return { event, sold: eventStats.sold, capacity: eventStats.capacity }
      })
      .sort((a, b) => new Date(a.event.startsAt).getTime() - new Date(b.event.startsAt).getTime())
      .slice(0, 5)
  })

  const liveEvent = createMemo(() => {
    const current = now()
    const snapshot = dashState()
    return (
      events().find((event) => {
        const s = dashEventStats({ state: snapshot, eventId: event.id, now: current })
        return dashEventPhaseGet({ event, sold: s.sold, capacity: s.capacity, now: current }) === "live"
      }) ?? null
    )
  })

  const heroEvent = () => todayEvent() ?? liveEvent()

  const activity = createMemo(() => {
    const active = org()
    if (!active) return []
    return dashOverviewActivityCreate({ state: dashState(), orgId: active.id, now: now() })
  })

  const todos = createMemo(() => {
    const active = org()
    if (!active) return []
    return dashOverviewTodosCreate({ state: dashState(), org: active, events: events() })
  })

  return (
    <div class="flex flex-col gap-4 sm:gap-5">
      <Show when={heroEvent()}>
        {(event) => (
          <Show when={org()}>
            {(activeOrg) => (
              <Show when={todayStats()}>
                {(eventStats) => (
                  <DashOverviewTodayCard
                    org={activeOrg()}
                    event={event()}
                    checkedIn={eventStats().checkedIn}
                    validTickets={eventStats().validTickets}
                  />
                )}
              </Show>
            )}
          </Show>
        )}
      </Show>
      <Show when={!isEinlass()}>
        <Show when={stats()}>
          {(orgStats) => (
            <DashOverviewKpis
              revenueCents={orgStats().revenueCents}
              revenueDelta={orgStats().deltas.revenue}
              revenueSpark={orgStats().series.map((point) => point.revenueCents / 100)}
              tickets={orgStats().tickets}
              ticketsDelta={orgStats().deltas.tickets}
              ticketsSpark={orgStats().series.map((point) => point.tickets)}
              orders={orgStats().orders}
              ordersDelta={orgStats().deltas.orders}
              avgCents={orgStats().avgOrderCents}
              avgDelta={orgStats().deltas.avgOrder}
              showRevenue={showRevenue()}
              zeitraumLabel={dashOverviewZeitraumLabel(p.state.zeitraum())}
            />
          )}
        </Show>
      </Show>
      <Show when={!isEinlass()}>
        <Show when={stats()}>
          {(orgStats) => (
            <DashOverviewSalesChart
              state={p.state}
              series={orgStats().series}
              previousRevenue={orgStats().previousRevenue}
            />
          )}
        </Show>
      </Show>
      <div class="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <div class="lg:col-span-2">
          <Show when={org()}>
            {(activeOrg) => <DashOverviewNextEvents org={activeOrg()} rows={nextRows()} now={now()} />}
          </Show>
        </div>
        <div class="flex flex-col gap-4 sm:gap-5">
          <DashOverviewActivity items={activity()} />
          <DashOverviewTodos todos={todos()} />
        </div>
      </div>
    </div>
  )
}
