import { useNavigate } from "@tanstack/solid-router"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { dashActiveOrg } from "../../store/dashActiveOrg.ts"
import { dashEventById } from "../../store/dashEventById.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import { dashEventPatch } from "../../store/actions/dashEventPatch.ts"

export function dashEventLayoutStateCreate(inputs: { eventId: () => string }) {
  const navigate = useNavigate()
  const event = () => dashEventById(inputs.eventId())
  const org = () => dashActiveOrg()
  const known = () => {
    const current = event()
    if (!current) return false
    return org()?.id === current.orgId
  }
  const banner = (): { tone: "draft" | "cancelled" | "paused"; text: string } | null => {
    const current = event()
    if (!current || !known()) return null
    if (current.status === "abgesagt")
      return { tone: "cancelled", text: `Abgesagt am ${dashDateFormat(current.updatedAt, "datum")}` }
    if (current.status === "entwurf") return { tone: "draft", text: "Entwurf · nur für dich sichtbar" }
    if (current.salesPaused) return { tone: "paused", text: "Verkauf pausiert" }
    return null
  }
  const openPublish = () => {
    const current = event()
    if (!current) return
    void navigate({ to: `/demo/dashboard/events/${current.id}` as never, search: { veroeffentlichen: 1 } as never })
  }
  const resumeSales = () => {
    const current = event()
    if (!current) return
    const result = dashEventPatch(current.id, { salesPaused: false }, { action: "Verkauf fortgesetzt" })
    if (!result.success) {
      toastAdd({ title: "Verkauf konnte nicht fortgesetzt werden", variant: "error" })
      return
    }
    toastAdd({ title: "Verkauf fortgesetzt", variant: "success" })
  }
  const state = () => dashStateGet()
  return { event, org, known, banner, openPublish, resumeSales, state }
}

export type DashEventLayoutState = ReturnType<typeof dashEventLayoutStateCreate>
