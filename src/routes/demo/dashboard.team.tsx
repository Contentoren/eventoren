import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import { createEffect } from "solid-js"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { dashSearchNumericString } from "../../dash/model/dashSearchNumericString.ts"
import { DashPageHeader } from "../../dash/ui/DashPageHeader.tsx"
import { DashTeamPage } from "../../dash/pages/team/ui/DashTeamPage.tsx"
import { dashTeamPageStateCreate } from "../../dash/pages/team/dashTeamPageStateCreate.ts"

function dashTeamInviteRequested(raw: Record<string, unknown>): boolean {
  return dashSearchNumericString(raw["einladen"], ["1"]) !== undefined
}

export const Route = createFileRoute("/demo/dashboard/team")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const raw = (input ?? {}) as Record<string, unknown>
    if (!dashTeamInviteRequested(raw)) return {}
    return { einladen: 1 }
  },
  head: () => demoRouteHeadCreate("Team · Eventoren Demo", "Mitglieder und Rollen.", "/demo/dashboard/team"),
  component: DashboardTeamRoute,
})

function DashboardTeamRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const state = dashTeamPageStateCreate()

  const inviteRequested = () => {
    const raw = (search() ?? {}) as Record<string, unknown>
    return dashTeamInviteRequested(raw) && state.canManage()
  }

  createEffect(() => {
    if (inviteRequested()) state.inviteOpen.set(true)
  })

  const dismissSearch = () => {
    if (!inviteRequested()) return
    void navigate({ to: "/demo/dashboard/team", search: {}, replace: true })
  }

  createEffect(() => {
    if (!state.inviteOpen.get()) dismissSearch()
  })

  return (
    <div>
      <DashPageHeader title="Team" description="Wer darf was in deiner Organisation." />
      <DashTeamPage state={state} inviteRequested={false} />
    </div>
  )
}
