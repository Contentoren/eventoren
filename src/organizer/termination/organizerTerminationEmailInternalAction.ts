"use node"
import { v } from "convex/values"
import { internalAction } from "#convex/_generated/server.js"
import { internal } from "#convex/_generated/api.js"
import { authEmailSend } from "#src/auth/convex/email/authEmailSend.ts"
export const organizerTerminationEmailInternalAction = internalAction({
  args: { requestId: v.id("organizerTerminationRequests") },
  handler: async (ctx, args) => {
    const claim = await ctx.runMutation(
      internal.organizerTerminationDelivery.organizerTerminationDeliveryClaimInternalMutation,
      args,
    )
    if (!claim) return
    const { request, delivery, attempt } = claim
    const timestamp = new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      dateStyle: "full",
      timeStyle: "long",
    }).format(new Date(request.receivedAt))
    const text = `Empfangsbestätigung Ihrer Erklärung\nID: ${request._id}\nEingang: ${timestamp}\nUTC: ${request.receivedAt}\n\n${request.declaration}\n\nDies bestätigt den Eingang, nicht die rechtliche Wirksamkeit oder das Vertragsende. Ihre Organisation wurde nicht automatisch deaktiviert.`
    const html = `<pre>${text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre>`
    let userSent = delivery.userSent
    let operatorSent = delivery.operatorSent
    const errors: string[] = []
    if (!userSent) {
      const result = await authEmailSend({
        toEmail: request.email,
        subject: "Eventoren – Empfang Ihrer Widerrufs-/Kündigungserklärung",
        text,
        html,
      })
      userSent = result.success
      if (!result.success) errors.push(result.errorMessage)
    }
    if (!operatorSent) {
      const result = await authEmailSend({
        toEmail: "kontakt@semesterkur.de",
        subject: `Eventoren – ${request.kind} ${request._id}`,
        text,
        html,
      })
      operatorSent = result.success
      if (!result.success) errors.push(result.errorMessage)
    }
    await ctx.runMutation(internal.organizerTerminationDelivery.organizerTerminationDeliveryUpdateInternalMutation, {
      requestId: args.requestId,
      attempt,
      userSent,
      operatorSent,
      ...(errors.length ? { error: errors.join("; ") } : {}),
    })
  },
})
