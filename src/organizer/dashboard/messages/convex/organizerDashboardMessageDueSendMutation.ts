import { internalMutation } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { organizerDashboardMessageDeliverActionReference } from "../organizerDashboardMessageDeliverActionReference.ts"
import { organizerDashboardMessageRecipientsCount } from "./organizerDashboardMessageRecipientsCount.ts"

const organizerDashboardMessageDueBatchLimit = 25

function organizerDashboardReminderBodyCreate(inputs: {
  title: string
  startsAt: string
  venue: string
  city: string
  directions: string
}): string {
  const when = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(inputs.startsAt))
  const lines = [`Hallo,`, ``, `morgen ist es so weit: ${inputs.title} (${when}, ${inputs.venue}, ${inputs.city}).`, ``]
  if (inputs.directions.trim().length > 0) lines.push(`Anfahrt: ${inputs.directions.trim()}`, ``)
  lines.push(`Dein Ticket findest du in deinem Kundenkonto. Bis bald!`)
  return lines.join("\n")
}

/**
 * Sends due work: scheduled messages whose time arrived, plus one automatic
 * 24h reminder per enabled event. Each reminder becomes a message with kind
 * `erinnerung`, so it stays visible, editable history instead of a silent
 * side effect. Reminder rows are marked sent only after handoff.
 */
export const organizerDashboardMessageDueSendMutation = internalMutation({
  args: {},
  handler: async (ctx): PromiseResult<{ messages: number; reminders: number }> => {
    const now = Date.now()
    const nowIso = new Date(now).toISOString()
    let messages = 0
    const due = await ctx.db
      .query("organizerDashboardMessages")
      .withIndex("orgIdAndEventKeyAndStatus")
      .filter((q) => q.eq(q.field("status"), "geplant"))
      .take(organizerDashboardMessageDueBatchLimit)
    for (const message of due) {
      if (message.deliveryState !== "queued") continue
      if (!message.scheduledAt || Date.parse(message.scheduledAt) > now) continue
      await ctx.scheduler.runAfter(0, organizerDashboardMessageDeliverActionReference, {
        messageId: message._id,
      })
      messages += 1
    }
    let reminders = 0
    const configs = await ctx.db
      .query("organizerDashboardMessageReminders")
      .take(organizerDashboardMessageDueBatchLimit)
    for (const config of configs) {
      if (!config.enabled || config.sentAt) continue
      const event = await ctx.db
        .query("catalogEvents")
        .withIndex("eventKey", (q) => q.eq("eventKey", config.eventKey))
        .unique()
      if (!event || event.orgId !== config.orgId) continue
      const startsAt = Date.parse(event.startsAt)
      if (Number.isNaN(startsAt) || startsAt - now > config.hoursBefore * 3600 * 1000 || startsAt <= now) continue
      const existing = await ctx.db
        .query("organizerDashboardMessages")
        .withIndex("orgIdAndEventKeyAndStatus", (q) =>
          q.eq("orgId", config.orgId).eq("eventKey", config.eventKey).eq("status", "gesendet"),
        )
        .filter((q) => q.eq(q.field("kind"), "erinnerung"))
        .take(1)
      if (existing.length > 0) {
        await ctx.db.patch("organizerDashboardMessageReminders", config._id, { sentAt: nowIso, updatedAt: nowIso })
        continue
      }
      const audience = { type: "alle" as const, tierKeys: [] as string[] }
      const recipientCount = await organizerDashboardMessageRecipientsCount(ctx, event.eventKey, audience)
      const created = await ctx.db.insert("organizerDashboardMessages", {
        orgId: config.orgId,
        eventKey: event.eventKey,
        kind: "erinnerung",
        audienceType: "alle",
        audienceTierKeys: [],
        subject: `Erinnerung: ${event.title}`,
        body: organizerDashboardReminderBodyCreate({
          title: event.title,
          startsAt: event.startsAt,
          venue: event.venue,
          city: event.city,
          directions: config.directions,
        }),
        status: "geplant",
        scheduledAt: nowIso,
        recipientCount,
        deliveryState: "queued",
        deliveryAttempts: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      await ctx.scheduler.runAfter(0, organizerDashboardMessageDeliverActionReference, { messageId: created })
      await ctx.db.patch("organizerDashboardMessageReminders", config._id, { sentAt: nowIso, updatedAt: nowIso })
      reminders += 1
    }
    return createResult({ messages, reminders })
  },
})
