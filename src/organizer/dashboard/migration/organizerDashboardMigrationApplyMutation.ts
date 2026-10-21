import * as v from "valibot"
import { v as convexV } from "convex/values"
import { mutation } from "#convex/_generated/server.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type PromiseResult } from "#result"
import { authMutationTokenToUserId } from "#src/utils/convex_backend/authMutationTokenToUserId.ts"
import { catalogAdminAuthorizeFn } from "#src/catalog/convex/catalogAdminAuthorizeFn.ts"
import { organizerDashboardOrganizationKindSchema } from "#src/organizer/dashboard/model/organizerDashboardOrganizationKindSchema.ts"
import { organizerDashboardRoleSchema } from "#src/organizer/dashboard/model/organizerDashboardRoleSchema.ts"
import { organizerDashboardAuditWrite } from "#src/organizer/dashboard/admin/organizerDashboardAuditWrite.ts"
import { organizerDashboardPricingRequestFn } from "#src/organizer/dashboard/pricing/organizerDashboardPricingRequestFn.ts"
import { organizerDashboardMigrationManifestSchema } from "./organizerDashboardMigrationManifestSchema.ts"

const maxTotalAssignments = 25
const maxOwnersRead = 26

type OrganizerDashboardMigrationApplyResult = {
  orgsInitialized: number
  eventsAssigned: number
  rolesAssigned: number
  scannerLinksApproved: number
}

/**
 * Bounded explicit legacy migration apply. Validates the ENTIRE manifest
 * before any write (a returned error never rolls back earlier writes, so
 * nothing is written until every assignment proves valid). Idempotent:
 * repeating an identical manifest writes nothing and returns zero counts.
 *
 * Every event-assignment target org must already be configured (or be
 * initialized in the same chunk) and must keep at least one effective owner
 * after staged role changes, so no event is bricked on an unconfigured or
 * ownerless target. Scanner Bearer [REDACTED] links never carry authority into a new
 * org silently: an event becoming owned disables existing unbound links for
 * it until each (link, event) pair is explicitly reapproved here.
 */
export const organizerDashboardMigrationApplyMutation = mutation({
  args: {
    token: convexV.string(),
    orgInits: convexV.array(convexV.object({ orgId: convexV.id("orgs"), kind: convexV.string() })),
    eventAssignments: convexV.array(convexV.object({ eventKey: convexV.string(), orgId: convexV.id("orgs") })),
    roleAssignments: convexV.array(
      convexV.object({
        userId: convexV.id("users"),
        orgId: convexV.id("orgs"),
        role: convexV.string(),
      }),
    ),
    scannerLinkApprovals: convexV.optional(
      convexV.array(
        convexV.object({
          linkId: convexV.id("scannerLinks"),
          eventKey: convexV.string(),
          orgId: convexV.id("orgs"),
        }),
      ),
    ),
  },
  handler: async (ctx, args): PromiseResult<OrganizerDashboardMigrationApplyResult> =>
    authMutationTokenToUserId(ctx, args, async (mutationCtx, data) => {
      const op = "organizerDashboardMigrationApplyMutation"
      const { userId, orgInits, eventAssignments, roleAssignments } = data
      const scannerLinkApprovals = data.scannerLinkApprovals ?? []
      const authorization = await catalogAdminAuthorizeFn(mutationCtx, userId)
      if (!authorization.success) return authorization
      const parsed = v.safeParse(organizerDashboardMigrationManifestSchema, {
        orgInits,
        eventAssignments,
        roleAssignments,
        scannerLinkApprovals,
      })
      if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
      const total = orgInits.length + eventAssignments.length + roleAssignments.length + scannerLinkApprovals.length
      if (total > maxTotalAssignments) {
        return createResultError(op, `Manifest exceeds ${maxTotalAssignments} total assignments`)
      }

      const orgIds = new Set<string>([
        ...orgInits.map((init) => init.orgId),
        ...eventAssignments.map((assignment) => assignment.orgId),
        ...roleAssignments.map((assignment) => assignment.orgId),
        ...scannerLinkApprovals.map((approval) => approval.orgId),
      ])
      const orgById = new Map<string, { orgHandle: string; name?: string }>()
      for (const orgId of orgIds) {
        const org = await mutationCtx.db.get("orgs", orgId as Id<"orgs">)
        if (!org) return createResultError(op, "Organization not found")
        orgById.set(orgId, { orgHandle: org.orgHandle, ...(org.name ? { name: org.name } : {}) })
      }

      const configByOrgId = new Map<string, { id: string; kind: string }>()
      const orgIdsNeedingConfig = new Set<string>([
        ...orgInits.map((init) => init.orgId),
        ...eventAssignments.map((assignment) => assignment.orgId),
        ...roleAssignments.map((assignment) => assignment.orgId),
      ])
      for (const orgId of orgIdsNeedingConfig) {
        const configs = await mutationCtx.db
          .query("organizerDashboardOrganizations")
          .withIndex("orgId", (q) => q.eq("orgId", orgId as Id<"orgs">))
          .take(2)
        if (configs.length > 1) return createResultError(op, "Organization configuration is ambiguous")
        const config = configs[0]
        if (config) configByOrgId.set(orgId, { id: config._id, kind: config.profile.kind })
      }

      const orgInitsToCreate: { orgId: Id<"orgs">; kind: string }[] = []
      for (const init of orgInits) {
        const kindParsed = v.safeParse(organizerDashboardOrganizationKindSchema, init.kind)
        if (!kindParsed.success) return createResultError(op, v.summarize(kindParsed.issues))
        const existing = configByOrgId.get(init.orgId)
        if (existing) {
          if (existing.kind !== kindParsed.output) {
            return createResultError(op, "Organization configuration kind mismatch")
          }
          continue
        }
        orgInitsToCreate.push({ orgId: init.orgId, kind: kindParsed.output })
      }

      const eventsToAssign: { id: string; eventKey: string; orgId: Id<"orgs"> }[] = []
      for (const assignment of eventAssignments) {
        if (assignment.eventKey.trim().length === 0) {
          return createResultError(op, "Event key cannot be empty")
        }
        const events = await mutationCtx.db
          .query("catalogEvents")
          .withIndex("eventKey", (q) => q.eq("eventKey", assignment.eventKey))
          .take(2)
        const event = events[0]
        if (!event) return createResultError(op, "Event not found")
        if (events.length > 1) return createResultError(op, "Event key is ambiguous")
        if (event.deletedAt) return createResultError(op, "Event is deleted")
        if (event.orgId !== undefined && event.orgId !== assignment.orgId) {
          return createResultError(op, "Event already has a different owner")
        }
        if (event.orgId === assignment.orgId) continue
        eventsToAssign.push({ id: event._id, eventKey: event.eventKey, orgId: assignment.orgId })
      }

      const rolesToPatch: { id: string; userId: string; orgId: string; role: string }[] = []
      for (const assignment of roleAssignments) {
        const roleParsed = v.safeParse(organizerDashboardRoleSchema, assignment.role)
        if (!roleParsed.success) return createResultError(op, v.summarize(roleParsed.issues))
        const user = await mutationCtx.db.get("users", assignment.userId)
        if (!user || user.deletedAt) return createResultError(op, "User not found")
        const memberships = await mutationCtx.db
          .query("orgMembers")
          .withIndex("userIdOrgId", (q) => q.eq("userId", assignment.userId).eq("orgId", assignment.orgId))
          .take(2)
        const membership = memberships[0]
        if (!membership) {
          return createResultError(op, "Organization membership required")
        }
        if (memberships.length > 1) {
          return createResultError(op, "Organization membership is ambiguous")
        }
        if (membership.organizerRole === roleParsed.output) continue
        rolesToPatch.push({
          id: membership._id,
          userId: assignment.userId,
          orgId: assignment.orgId,
          role: roleParsed.output,
        })
      }

      const effectiveOwnerUserIds = async (orgId: string): Promise<Set<string>> => {
        const owners = await mutationCtx.db
          .query("orgMembers")
          .withIndex("orgIdAndOrganizerRole", (q) => q.eq("orgId", orgId as Id<"orgs">).eq("organizerRole", "inhaber"))
          .take(maxOwnersRead)
        const effective = new Set(owners.map((owner) => owner.userId as string))
        for (const patch of rolesToPatch) {
          if (patch.orgId !== orgId) continue
          if (patch.role === "inhaber") effective.add(patch.userId)
          else effective.delete(patch.userId)
        }
        return effective
      }

      const orgIdsLosingOwner = new Set<string>()
      for (const patch of rolesToPatch) {
        const current = await mutationCtx.db.get("orgMembers", patch.id as Id<"orgMembers">)
        if (current?.organizerRole === "inhaber" && patch.role !== "inhaber") {
          orgIdsLosingOwner.add(patch.orgId)
        }
      }
      if (orgIdsLosingOwner.size > 0) {
        const orgIdsWithEvents = new Set<string>()
        for (const assignment of eventsToAssign) orgIdsWithEvents.add(assignment.orgId)
        for (const orgId of orgIdsLosingOwner) {
          const hasConfig = configByOrgId.has(orgId) || orgInitsToCreate.some((init) => init.orgId === orgId)
          const ownsStagedEvents = orgIdsWithEvents.has(orgId)
          const ownsExistingEvents =
            ownsStagedEvents ||
            (
              await mutationCtx.db
                .query("catalogEvents")
                .withIndex("orgIdAndStartsAt", (q) => q.eq("orgId", orgId as Id<"orgs">))
                .take(1)
            ).length > 0
          if (!hasConfig && !ownsExistingEvents) continue
          const remaining = await effectiveOwnerUserIds(orgId)
          if (remaining.size === 0) {
            return createResultError(op, "Organization must keep at least one owner")
          }
        }
      }

      const eventTargetOrgIds = new Set(eventAssignments.map((assignment) => assignment.orgId as string))
      for (const orgId of eventTargetOrgIds) {
        const hasConfig = configByOrgId.has(orgId) || orgInitsToCreate.some((init) => init.orgId === orgId)
        if (!hasConfig) {
          return createResultError(op, "Event target organization is not configured")
        }
        const effective = await effectiveOwnerUserIds(orgId)
        if (effective.size === 0) {
          return createResultError(op, "Event target organization must have at least one owner")
        }
      }

      const stagedEventOwnerByKey = new Map<string, string>()
      for (const assignment of eventAssignments) {
        stagedEventOwnerByKey.set(assignment.eventKey, assignment.orgId as string)
      }
      const seenApprovalPairs = new Set<string>()
      const approvalsToWrite: { linkId: string; eventKey: string; orgId: Id<"orgs"> }[] = []
      const approvedPairs = new Set<string>()
      for (const approval of scannerLinkApprovals) {
        if (approval.eventKey.trim().length === 0) {
          return createResultError(op, "Event key cannot be empty")
        }
        const pairKey = `${approval.linkId}:${approval.eventKey}`
        const fullKey = `${pairKey}:${approval.orgId}`
        if (approvedPairs.has(fullKey)) continue
        if (seenApprovalPairs.has(pairKey)) {
          return createResultError(op, "Scanner link approval is ambiguous")
        }
        seenApprovalPairs.add(pairKey)
        const link = await mutationCtx.db.get("scannerLinks", approval.linkId as Id<"scannerLinks">)
        if (!link) return createResultError(op, "Scanner link not found")
        const events = await mutationCtx.db
          .query("catalogEvents")
          .withIndex("eventKey", (q) => q.eq("eventKey", approval.eventKey))
          .take(2)
        const event = events[0]
        if (!event) return createResultError(op, "Event not found")
        if (events.length > 1) return createResultError(op, "Event key is ambiguous")
        if (event.deletedAt) return createResultError(op, "Event is deleted")
        const postManifestOwner = stagedEventOwnerByKey.get(approval.eventKey) ?? event.orgId
        if (postManifestOwner === undefined) {
          return createResultError(op, "Event has no owning organization")
        }
        if (approval.orgId !== postManifestOwner) {
          return createResultError(op, "Scanner link approval targets a different organization")
        }
        if (!link.eventKeys.includes(approval.eventKey)) {
          return createResultError(op, "Scanner link does not cover event")
        }
        if (link.role === "helper") {
          const parent = link.parentId ? await mutationCtx.db.get("scannerLinks", link.parentId) : null
          const parentCovers =
            parent !== null && parent.role === "organizer" && parent.eventKeys.includes(approval.eventKey)
          const parentBound = parentCovers && (parent?.eventOrgIds?.[approval.eventKey] ?? null) === postManifestOwner
          const parentStaged =
            parentCovers && approvedPairs.has(`${parent?._id}:${approval.eventKey}:${postManifestOwner}`)
          if (!parentCovers || (!parentBound && !parentStaged)) {
            return createResultError(op, "Scanner link parent approval missing")
          }
        }
        approvedPairs.add(fullKey)
        if ((link.eventOrgIds?.[approval.eventKey] ?? undefined) === approval.orgId) continue
        approvalsToWrite.push({
          linkId: link._id,
          eventKey: approval.eventKey,
          orgId: approval.orgId,
        })
      }

      const now = new Date().toISOString()
      for (const init of orgInitsToCreate) {
        const org = orgById.get(init.orgId)
        if (!org) return createResultError(op, "Organization not found")
        await mutationCtx.db.insert("organizerDashboardOrganizations", {
          orgId: init.orgId,
          status: "pruefung",
          profile: {
            name: org.name ?? org.orgHandle,
            slug: org.orgHandle,
            kind: init.kind as "verein" | "unternehmen" | "schule" | "privat",
          },
          tax: { status: "regel", defaultRateBps: 1900 },
          fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
          contracts: {},
          configurationConfirmed: false,
          createdAt: now,
          updatedAt: now,
        })
        await organizerDashboardAuditWrite(mutationCtx, {
          orgId: init.orgId,
          actorUserId: userId,
          area: "migration",
          action: "migrated",
          note: `org:${init.orgId}`,
          at: now,
        })
      }
      for (const assignment of eventsToAssign) {
        await mutationCtx.db.patch("catalogEvents", assignment.id as Id<"catalogEvents">, {
          orgId: assignment.orgId,
          updatedAt: now,
        })
        await organizerDashboardAuditWrite(mutationCtx, {
          orgId: assignment.orgId,
          actorUserId: userId,
          area: "migration",
          action: "migrated",
          note: `event:${assignment.eventKey}`,
          at: now,
        })
      }
      for (const patch of rolesToPatch) {
        await mutationCtx.db.patch("orgMembers", patch.id as Id<"orgMembers">, {
          organizerRole: patch.role as "inhaber" | "admin" | "eventmanager" | "finanzen" | "einlass",
          updatedAt: now,
        })
        await organizerDashboardAuditWrite(mutationCtx, {
          orgId: patch.orgId as Id<"orgs">,
          actorUserId: userId,
          area: "migration",
          action: "migrated",
          note: `role:${patch.userId}:${patch.role}`,
          at: now,
        })
      }
      let scannerLinksApproved = 0
      for (const approval of approvalsToWrite) {
        const link = await mutationCtx.db.get("scannerLinks", approval.linkId as Id<"scannerLinks">)
        if (!link) return createResultError(op, "Scanner link not found")
        await mutationCtx.db.patch("scannerLinks", approval.linkId as Id<"scannerLinks">, {
          eventOrgIds: { ...(link.eventOrgIds ?? {}), [approval.eventKey]: approval.orgId },
        })
        await organizerDashboardAuditWrite(mutationCtx, {
          orgId: approval.orgId,
          actorUserId: userId,
          area: "migration",
          action: "migrated",
          note: `scanner-link:${approval.linkId}:${approval.eventKey}`,
          at: now,
        })
        scannerLinksApproved += 1
      }
      if (eventsToAssign.length > 0) {
        const pricingOrgIds = [...new Set(eventsToAssign.map((assignment) => assignment.orgId as string))]
        for (const pricingOrgId of pricingOrgIds) {
          const requested = await organizerDashboardPricingRequestFn(mutationCtx, {
            orgId: pricingOrgId as Id<"orgs">,
            startedByUserId: userId,
            now,
          })
          if (!requested.success) return requested
        }
      }
      return createResult({
        orgsInitialized: orgInitsToCreate.length,
        eventsAssigned: eventsToAssign.length,
        rolesAssigned: rolesToPatch.length,
        scannerLinksApproved,
      })
    }),
})
