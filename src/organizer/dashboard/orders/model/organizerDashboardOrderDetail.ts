import type { Id } from "#convex/_generated/dataModel.js"
import type { OrganizerDashboardOrderSummary } from "./organizerDashboardOrderSummaryCreate.ts"
import type { OrganizerDashboardOrderParticipant } from "./organizerDashboardOrderParticipantCreate.ts"

export type OrganizerDashboardOrderDetail = OrganizerDashboardOrderSummary & {
  historicalContact: { givenName: string; familyName: string; email: string; phone: string; address: string }
  operationalContact: { givenName?: string; familyName?: string; email?: string; phone?: string } | null
  lines: { lineId: string; tierName: string; quantity: number; priceCents: number; feeCents: number }[]
  tickets: OrganizerDashboardOrderParticipant[]
  notes: { noteId: Id<"organizerDashboardOrderNotes">; text: string; createdAt: string }[]
  truncated: { lines: boolean; tickets: boolean; notes: boolean }
}
