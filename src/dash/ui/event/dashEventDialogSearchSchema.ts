import * as v from "valibot"

const dialogFlagSchema = v.optional(v.union([v.literal("1"), v.literal(1)]))

/**
 * Search-Params für die vier Event-Dialoge (`veroeffentlichen`, `duplizieren`,
 * `vorlage-speichern`, `absagen` = 1). Gültig in allen Event-Unterseiten.
 *
 * Intern als Zahl normalisiert, damit TanStack die URLs sauber hält
 * (`?duplizieren=1` statt `?duplizieren=%221%22`); die Leser prüfen beide Varianten.
 */
export const dashEventDialogSearchSchema = v.object({
  veroeffentlichen: dialogFlagSchema,
  duplizieren: dialogFlagSchema,
  "vorlage-speichern": dialogFlagSchema,
  absagen: dialogFlagSchema,
})

export type DashEventDialogSearch = v.InferOutput<typeof dashEventDialogSearchSchema>
