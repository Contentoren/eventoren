import * as v from "valibot"
import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { dashSearchNumericString } from "../../dash/model/dashSearchNumericString.ts"
import { dashEventDialogSearchParse } from "../../dash/ui/event/dashEventDialogSearchParse.ts"
import { DashCodesPage } from "../../dash/pages/codes/ui/DashCodesPage.tsx"

const dashCodesSearchSchema = v.object({
  art: v.optional(v.picklist(["rabatt", "zugang"])),
  code: v.optional(v.string()),
})

export const Route = createFileRoute("/demo/dashboard/events/$eventId/codes")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const raw = (input ?? {}) as Record<string, unknown>
    const parsed = v.safeParse(dashCodesSearchSchema, raw)
    const output: Record<string, unknown> = {
      ...dashEventDialogSearchParse(raw),
      ...(parsed.success ? parsed.output : {}),
    }
    if (dashSearchNumericString(raw["mehrere"], ["1"]) !== undefined) output["mehrere"] = 1
    return output
  },
  head: () => demoRouteHeadCreate("Codes · Eventoren Demo", "Rabatt- und Zugangscodes.", "/demo/dashboard/events"),
  component: DashCodesRoute,
})

function DashCodesRoute() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const art = () => {
    const raw = (search() as Record<string, unknown>)["art"]
    return raw === "zugang" ? ("zugang" as const) : ("rabatt" as const)
  }
  const code = () => {
    const raw = (search() as Record<string, unknown>)["code"]
    return typeof raw === "string" && raw.length > 0 ? raw : undefined
  }
  const mehrere = () => {
    const raw = (search() as Record<string, unknown>)["mehrere"]
    return dashSearchNumericString(raw, ["1"]) !== undefined
  }
  return <DashCodesPage eventId={params().eventId} search={{ art: art(), code: code(), mehrere: mehrere() }} />
}
