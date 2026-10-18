import * as v from "valibot"
import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DashProfilePage } from "../../dash/public/profile/DashProfilePage.tsx"
import { DashProfileSkeleton } from "../../dash/public/profile/DashProfileSkeleton.tsx"
import type { DashProfileTab } from "../../dash/public/profile/dashProfilePageStateCreate.ts"
import { dashProfilePageStateCreate } from "../../dash/public/profile/dashProfilePageStateCreate.ts"

const profileSearchSchema = v.object({
  tab: v.optional(v.picklist(["kommende", "vergangene"])),
})

function dashProfileTabParse(raw: Record<string, unknown>): DashProfileTab {
  const parsed = v.safeParse(profileSearchSchema, raw)
  if (parsed.success && parsed.output.tab) return parsed.output.tab
  return "kommende"
}

export const Route = createFileRoute("/demo/customer_/veranstalter_/$orgSlug")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const raw = (input ?? {}) as Record<string, unknown>
    const parsed = v.safeParse(profileSearchSchema, raw)
    const output: Record<string, unknown> = {}
    if (parsed.success && parsed.output.tab && parsed.output.tab !== "kommende") output["tab"] = parsed.output.tab
    return output
  },
  head: () =>
    demoRouteHeadCreate(
      "Veranstalter · Eventoren Demo",
      "Lokales öffentliches Veranstalterprofil mit Events.",
      "/demo/customer/veranstalter/kulturhaus-lindenhof",
    ),
  component: () => (
    <ClientOnly fallback={<DashProfileSkeleton />}>
      <DashProfileRoute />
    </ClientOnly>
  ),
})

function DashProfileRoute() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()

  const state = dashProfilePageStateCreate({
    orgSlug: () => params().orgSlug,
    tab: () => dashProfileTabParse(search() as Record<string, unknown>),
    onTab: (tab) => {
      const next: Record<string, string> = {}
      if (tab !== "kommende") next["tab"] = tab
      void navigate({
        to: "/demo/customer/veranstalter/$orgSlug",
        params: { orgSlug: params().orgSlug },
        search: next,
        replace: true,
      })
    },
  })

  return <DashProfilePage state={state} />
}
