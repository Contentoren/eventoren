import * as v from "valibot"
import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import {
  DashVouchersPage,
  dashVouchersSearchParse,
  type DashVouchersSearch,
} from "../../dash/pages/vouchers/ui/DashVouchersPage.tsx"

const gutscheinSearchSchema = v.object({
  gutschein: v.optional(v.string()),
  status: v.optional(v.string()),
  q: v.optional(v.string()),
})

const gutscheinKeyOf = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined

export const Route = createFileRoute("/demo/dashboard/gutscheine")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const raw = (input ?? {}) as Record<string, unknown>
    const parsed = v.safeParse(gutscheinSearchSchema, raw)
    const output: Record<string, unknown> = {}
    const gutschein = gutscheinKeyOf(parsed.success ? parsed.output.gutschein : raw["gutschein"])
    const parsedSearch = dashVouchersSearchParse(parsed.success ? parsed.output : raw)
    if (gutschein !== undefined) output["gutschein"] = gutschein
    if (parsedSearch.status !== "alle") output["status"] = parsedSearch.status
    if (parsedSearch.q !== "") output["q"] = parsedSearch.q
    return output
  },
  head: () =>
    demoRouteHeadCreate(
      "Gutscheine · Eventoren Demo",
      "Verkaufte und eingelöste Gutscheine.",
      "/demo/dashboard/gutscheine",
    ),
  component: DashboardGutscheineRoute,
})

function DashboardGutscheineRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const parsed = (): DashVouchersSearch => dashVouchersSearchParse(search() as Record<string, unknown>)

  const patch = (delta: Partial<DashVouchersSearch>) => {
    const current = { ...parsed(), ...delta }
    const next: Record<string, string> = {}
    if (current.gutschein !== undefined) next["gutschein"] = current.gutschein
    if (current.status !== "alle") next["status"] = current.status
    if (current.q !== "") next["q"] = current.q
    void navigate({ to: "/demo/dashboard/gutscheine", search: next, replace: true })
  }

  return <DashVouchersPage search={parsed} onPatch={patch} />
}
