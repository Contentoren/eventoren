import * as v from "valibot"

/** Message kind: info, change, cancellation, or the automatic 24h reminder. */
export const organizerDashboardMessageKindSchema = v.picklist(
  ["info", "aenderung", "absage", "erinnerung"],
  "Bitte wähle eine Nachrichtenart.",
)

export type OrganizerDashboardMessageKind = v.InferOutput<typeof organizerDashboardMessageKindSchema>

/** Recipient filter for ticket holders of one event. */
export const organizerDashboardMessageAudienceSchema = v.object({
  type: v.picklist(["alle", "ticketarten", "eingecheckt", "nicht-eingecheckt"], "Bitte wähle eine Empfängergruppe."),
  tierKeys: v.pipe(
    v.array(
      v.pipe(
        v.string(),
        v.trim(),
        v.minLength(1, "Bitte gib eine Ticketart an."),
        v.maxLength(160, "Ticketart zu lang."),
      ),
    ),
    v.maxLength(50, "Höchstens 50 Ticketarten erlaubt."),
  ),
})

export type OrganizerDashboardMessageAudience = v.InferOutput<typeof organizerDashboardMessageAudienceSchema>

export const organizerDashboardMessageContentSchema = v.object({
  kind: organizerDashboardMessageKindSchema,
  audience: organizerDashboardMessageAudienceSchema,
  subject: v.pipe(v.string(), v.trim(), v.minLength(1, "Betreff fehlt"), v.maxLength(200, "Betreff zu lang")),
  body: v.pipe(v.string(), v.trim(), v.minLength(1, "Text fehlt"), v.maxLength(10000, "Text zu lang")),
})

export type OrganizerDashboardMessageContent = v.InferOutput<typeof organizerDashboardMessageContentSchema>

/** Editorial status: draft, scheduled (scheduledAt set), sent (sentAt set). */
export const organizerDashboardMessageStatusSchema = v.picklist(["entwurf", "geplant", "gesendet"])

export type OrganizerDashboardMessageStatus = v.InferOutput<typeof organizerDashboardMessageStatusSchema>

/** Per-event 24h reminder configuration with directions and calendar entry. */
export const organizerDashboardMessageReminderSchema = v.object({
  enabled: v.boolean(),
  hoursBefore: v.pipe(
    v.number(),
    v.integer("Die Stundenanzahl muss eine ganze Zahl sein."),
    v.minValue(1, "Mindestens 1 Stunde vorher erinnern."),
    v.maxValue(72, "Höchstens 72 Stunden vorher erinnern."),
  ),
  directions: v.pipe(v.string(), v.trim(), v.maxLength(2000, "Anfahrt zu lang")),
  calendar: v.boolean(),
})

export type OrganizerDashboardMessageReminder = v.InferOutput<typeof organizerDashboardMessageReminderSchema>
