import * as v from "valibot"
import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { dashSearchNumericString } from "../../dash/model/dashSearchNumericString.ts"
import { dashEventDialogSearchParse } from "../../dash/ui/event/dashEventDialogSearchParse.ts"
import { DashMessagesPage } from "../../dash/pages/messages/ui/DashMessagesPage.tsx"

const dashMessagesSearchSchema = v.object({
  nachricht: v.optional(v.string()),
})

export const Route = createFileRoute("/demo/dashboard/events/$eventId/nachrichten")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const raw = (input ?? {}) as Record<string, unknown>
    const parsed = v.safeParse(dashMessagesSearchSchema, raw)
    const nachricht =
      parsed.success && typeof parsed.output.nachricht === "string" ? parsed.output.nachricht : undefined
    const dialogs = dashEventDialogSearchParse(raw)
    return {
      ...dialogs,
      ...(nachricht !== undefined ? { nachricht } : {}),
    }
  },
  head: () =>
    demoRouteHeadCreate(
      "Nachrichten · Eventoren Demo",
      "Infos an Ticketinhaber und Erinnerung.",
      "/demo/dashboard/events",
    ),
  component: DashNachrichtenRoute,
})

function DashNachrichtenRoute() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const rawNachricht = () => (search() as Record<string, unknown>)["nachricht"]
  const rawAbsagen = () => (search() as Record<string, unknown>)["absagen"]
  const nachricht = () =>
    typeof rawNachricht() === "string" && rawNachricht() !== "" ? (rawNachricht() as string) : undefined
  return (
    <DashMessagesPage
      eventId={params().eventId}
      search={{ nachricht: nachricht(), absagen: dashSearchNumericString(rawAbsagen(), ["1"]) !== undefined }}
    />
  )
}
