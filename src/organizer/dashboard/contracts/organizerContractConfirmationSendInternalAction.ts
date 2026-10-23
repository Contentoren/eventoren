"use node"

import { v } from "convex/values"
import { internal } from "#convex/_generated/api.js"
import { internalAction } from "#convex/_generated/server.js"
import { authEmailSend } from "#src/auth/convex/email/authEmailSend.ts"

/** Render only the immutable evidence, not today's potentially revised documents. */
export const organizerContractConfirmationSendInternalAction = internalAction({
  args: { deliveryId: v.id("organizerDashboardContractDeliveries") },
  handler: async (ctx, { deliveryId }) => {
    const claim = await ctx.runMutation(
      internal.organizerContractDelivery.organizerContractDeliveryClaimInternalMutation,
      { deliveryId },
    )
    if (!claim) return
    const evidence = claim.evidence
    const party = evidence.party!
    const fee = evidence.acceptedFee!
    const text = [
      "Eventoren – Vertragsbestätigung einschließlich Preisblatt und AVV",
      `Vertragsschluss (Europe/Berlin): ${new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", dateStyle: "full", timeStyle: "long" }).format(new Date(evidence.acceptedAt))}`,
      `Vertragspartner: ${party.legalName}; vertreten durch ${party.representativeName}`,
      `${party.streetAddress}, ${party.postalCode} ${party.city}, ${party.countryCode}`,
      `E-Mail: ${party.email}; Kundenart: ${party.customerType}`,
      `Vertretungsberechtigung bestätigt: ${evidence.authorityConfirmed ? "Ja" : "Nein"}`,
      `Preis: ${fee.percentBps / 100} % + ${(fee.fixedCents / 100).toFixed(2)} EUR brutto je bezahltem Ticket. Kostenträger: ${fee.payer}. Kostenlose Tickets frei. Zahlungsabwicklung inklusive. Kein Grundpreis.`,
      `Vorzeitiger Leistungsbeginn ausdrücklich verlangt: ${evidence.earlyServiceStartRequested ? "Ja" : "Nein"}. Das Widerrufsrecht erlischt dadurch nicht automatisch.`,
      `${evidence.termsDocumentId} – ${evidence.termsRevision}`,
      ...evidence.termsSnapshot.map(({ heading, body }) => `${heading}\n${body}`),
      `${evidence.dpaDocumentId} – ${evidence.dpaRevision}`,
      ...evidence.dpaSnapshot.map(({ heading, body }) => `${heading}\n${body}`),
    ].join("\n\n")
    const html = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    const result = await authEmailSend({
      toEmail: party.email,
      subject: "Eventoren – Vertragsbestätigung einschließlich Preisblatt und AVV",
      text,
      html: `<pre style="white-space:pre-wrap">${html}</pre>`,
    })
    await ctx.runMutation(internal.organizerContractDelivery.organizerContractDeliveryUpdateInternalMutation, {
      deliveryId,
      attempts: claim.attempts,
      sent: result.success,
    })
    if (!result.success)
      console.error("organizerContractConfirmationSendInternalAction", {
        deliveryId,
        attempts: claim.attempts,
        status: "SMTP delivery failed",
      })
  },
})
