import * as v from "valibot"

const organizerDashboardTeamDialogSchema = v.picklist(["einladen", "entfernen", "rolle"])

const organizerDashboardTeamSearchSchema = v.object({
  org: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
  dialog: v.optional(organizerDashboardTeamDialogSchema),
  mitglied: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(100))),
})

/**
 * URL state of the team page: the open dialog and the member it acts on.
 * Every dialog state lives in the URL, so a reload or a shared link keeps the
 * same view.
 */
export function organizerDashboardTeamSearchParse(value: unknown): {
  readonly org: string | undefined
  readonly dialog: "einladen" | "entfernen" | "rolle" | undefined
  readonly mitglied: string | undefined
} {
  const result = v.safeParse(organizerDashboardTeamSearchSchema, value)
  if (!result.success) return { org: undefined, dialog: undefined, mitglied: undefined }
  return {
    org: result.output.org,
    dialog: result.output.dialog,
    mitglied: result.output.mitglied,
  }
}
