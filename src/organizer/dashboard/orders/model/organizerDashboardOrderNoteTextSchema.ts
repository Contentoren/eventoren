import * as v from "valibot"

/** Internal note text; trimmed, non-empty and bounded. */
export const organizerDashboardOrderNoteTextSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "Bitte gib eine Notiz ein."),
  v.maxLength(1000, "Die Notiz darf höchstens 1000 Zeichen lang sein."),
)

export type OrganizerDashboardOrderNoteText = v.InferOutput<typeof organizerDashboardOrderNoteTextSchema>
