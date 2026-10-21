import { v as convexV } from "convex/values"
import type { Id } from "#convex/_generated/dataModel.js"
import { mutation } from "#convex/_generated/server.js"
import * as v from "valibot"
import { createResult, createResultError, type PromiseResult } from "#result"
import { organizerDashboardAuthorize } from "#src/organizer/dashboard/convex/organizerDashboardAuthorize.ts"
import { organizerDashboardTeamDeliverActionReference } from "#src/organizer/dashboard/team/organizerDashboardTeamDeliverActionReference.ts"
import { organizerDashboardTeamEmailNormalize } from "#src/organizer/dashboard/team/organizerDashboardTeamEmailNormalize.ts"
import { organizerDashboardTeamInvitationExpiresAt } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationExpiresAt.ts"
import type { OrganizerDashboardTeamInvitation } from "#src/organizer/dashboard/team/organizerDashboardTeamInvitationSchema.ts"
import { organizerDashboardTeamInviteSchema } from "#src/organizer/dashboard/team/organizerDashboardTeamInviteSchema.ts"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"

// Targeted legacy-case compatibility, not a global users scan. Fail closed
// beyond 200 org memberships until canonical indexed email migration exists.
const legacyRosterBudget = 200

/**
 * Creates team invitations for one organization.
 *
 * The role and the organization are never taken from the request beyond the
 * authorized organization: the role is validated against the five organizer
 * roles, the address is normalized, and the invitation is bound to the
 * organization of the authorized manager. Duplicate addresses, duplicate
 * pending invitations and addresses that already belong to a member of the
 * organization are refused instead of being resolved by guesswork.
 */
export const organizerDashboardTeamInviteMutation = mutation({
  args: {
    token: convexV.string(),
    orgId: convexV.id("orgs"),
    emails: convexV.array(convexV.string()),
    organizerRole: convexV.string(),
  },
  handler: (ctx, args): PromiseResult<{ readonly invitations: readonly OrganizerDashboardTeamInvitation[] }> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, { userId, orgId, emails, organizerRole }) => {
      const op = "organizerDashboardTeamInviteMutation"
      const authorization = await organizerDashboardAuthorize(mutationCtx, userId, orgId, "team.verwalten")
      if (!authorization.success) return authorization

      const rawEmails = emails.map((email) => email.trim())
      const parsed = v.safeParse(organizerDashboardTeamInviteSchema, {
        emails: rawEmails.map(organizerDashboardTeamEmailNormalize),
        organizerRole,
      })
      if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
      const input = parsed.output
      if (input.organizerRole === "inhaber" && authorization.data.role !== "inhaber") {
        return createResultError(op, "Only the current owner can invite the owner role")
      }
      if (new Set(input.emails).size !== input.emails.length) {
        return createResultError(op, "The batch contains the same address more than once")
      }
      const rawByNormalized = new Map<string, string>()
      for (const raw of rawEmails) rawByNormalized.set(organizerDashboardTeamEmailNormalize(raw), raw)

      const now = new Date()
      const nowIso = now.toISOString()
      const expiresAt = organizerDashboardTeamInvitationExpiresAt(now)
      const org = await mutationCtx.db.get("orgs", orgId)
      const orgName = org?.name ?? org?.orgHandle ?? "Organisation"

      // Account email indexes are case-sensitive for legacy stored addresses.
      // Read canonical users of this bounded org roster once per batch, never
      // scan all users or pretend a truncated roster proves non-membership.
      const roster = await mutationCtx.db
        .query("orgMembers")
        .withIndex("orgId", (q) => q.eq("orgId", orgId))
        .take(legacyRosterBudget + 1)
      if (roster.length > legacyRosterBudget) {
        return createResultError(
          op,
          "Legacy email safety check exceeded its 200-membership budget; canonical email migration is required",
        )
      }
      for (const member of roster) {
        const account = await mutationCtx.db.get("users", member.userId)
        if (account?.email && input.emails.includes(organizerDashboardTeamEmailNormalize(account.email))) {
          return createResultError(
            op,
            `${organizerDashboardTeamEmailNormalize(account.email)} is already a member of this organization`,
          )
        }
      }
      const stalePendingIds: Id<"organizerDashboardTeamInvitations">[] = []
      // Validate the complete batch before writing, including expiry cleanup.
      for (const email of input.emails) {
        const existing = await mutationCtx.db
          .query("organizerDashboardTeamInvitations")
          .withIndex("orgIdAndInvitedEmailAndStatusAndExpiresAt", (q) =>
            q.eq("orgId", orgId).eq("invitedEmail", email).eq("status", "pending").gt("expiresAt", nowIso),
          )
          .take(2)
        if (existing.length > 0) {
          return createResultError(op, `${email} already has an open invitation`)
        }
        const expired = await mutationCtx.db
          .query("organizerDashboardTeamInvitations")
          .withIndex("orgIdAndInvitedEmailAndStatusAndExpiresAt", (q) =>
            q.eq("orgId", orgId).eq("invitedEmail", email).eq("status", "pending").lte("expiresAt", nowIso),
          )
          .take(2)
        stalePendingIds.push(...expired.map((invitation) => invitation._id))

        for (const lookup of new Set([email, rawByNormalized.get(email) ?? email])) {
          const users = await mutationCtx.db
            .query("users")
            .withIndex("email", (q) => q.eq("email", lookup))
            .take(2)
          if (users.length > 1) return createResultError(op, `The address ${email} belongs to more than one account`)
          const user = users[0]
          if (!user) continue
          const memberships = await mutationCtx.db
            .query("orgMembers")
            .withIndex("userIdOrgId", (q) => q.eq("userId", user._id).eq("orgId", orgId))
            .take(2)
          if (memberships.length > 1) return createResultError(op, `The membership of ${email} is ambiguous`)
          if (memberships.length === 1) {
            return createResultError(op, `${email} is already a member of this organization`)
          }
        }
      }

      // Bounded expiry housekeeping retains every historical invitation.
      for (const id of stalePendingIds) {
        await mutationCtx.db.patch("organizerDashboardTeamInvitations", id, { status: "expired", updatedAt: nowIso })
      }
      const created: OrganizerDashboardTeamInvitation[] = []
      for (const email of input.emails) {
        const invitationId = await mutationCtx.db.insert("organizerDashboardTeamInvitations", {
          orgId,
          invitedEmail: email,
          organizerRole: input.organizerRole,
          status: "pending",
          invitedByUserId: userId,
          expiresAt,
          deliveryState: "queued",
          deliveryAttempts: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        await mutationCtx.scheduler.runAfter(0, organizerDashboardTeamDeliverActionReference, { invitationId })
        created.push({
          id: invitationId,
          orgId,
          orgName,
          invitedEmail: email,
          organizerRole: input.organizerRole,
          status: "pending",
          deliveryState: "queued",
          deliveryAttempts: 0,
          deliveryReason: null,
          expiresAt,
          createdAt: nowIso,
        })
      }
      return createResult({ invitations: created })
    }),
})
