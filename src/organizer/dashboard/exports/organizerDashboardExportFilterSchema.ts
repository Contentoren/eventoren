import * as v from "valibot"

/** Exported list kind. Teilnehmer and Bestellungen need bestellungen.sehen, Check-ins need einlass.nutzen. */
export const organizerDashboardExportKindSchema = v.picklist(["teilnehmer", "bestellungen", "checkins"])

export type OrganizerDashboardExportKind = v.InferOutput<typeof organizerDashboardExportKindSchema>

/** Shared export filters. Every surface coerces through this schema. */
export const organizerDashboardExportFilterSchema = v.strictObject({
  orgId: v.pipe(v.string(), v.trim(), v.nonEmpty("Cannot be empty")),
  eventKey: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
  kind: organizerDashboardExportKindSchema,
})

export type OrganizerDashboardExportFilter = v.InferOutput<typeof organizerDashboardExportFilterSchema>
