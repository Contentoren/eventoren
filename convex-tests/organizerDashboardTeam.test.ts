import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import type { Id } from "../convex/_generated/dataModel.js"
import type * as teamModule from "../convex/organizerDashboardTeam.js"
import schema from "../convex/schema.js"
import { organizerDashboardTeamFunctionReference } from "#src/organizer/dashboard/team/organizerDashboardTeamFunctionReference.ts"
import { organizerDashboardTeamReferences } from "#src/organizer/dashboard/api/organizerDashboardTeamReferences.ts"
import { testAuthSessionTokenCreate } from "./testAuthSessionTokenCreate.ts"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "eventoren-auth-convex-test-secret"
process.env.AUTH_SECRET = authSecret
const now = "2026-10-21T00:00:00.000Z"
const paginationOpts = { numItems: 25, cursor: null } as const

const teamApi = { organizerDashboardTeam: organizerDashboardTeamReferences }
const claimReference = organizerDashboardTeamFunctionReference<
  typeof teamModule.organizerDashboardTeamInvitationDeliveryClaimMutation
>("organizerDashboardTeam:organizerDashboardTeamInvitationDeliveryClaimMutation")
const recordReference = organizerDashboardTeamFunctionReference<
  typeof teamModule.organizerDashboardTeamInvitationDeliveryRecordMutation
>("organizerDashboardTeam:organizerDashboardTeamInvitationDeliveryRecordMutation")

type TeamRole = "inhaber" | "admin" | "eventmanager" | "finanzen" | "einlass"

async function teamUserInsert(
  t: ReturnType<typeof convexTest>,
  options?: { readonly email?: string; readonly name?: string },
): Promise<Id<"users">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      name: options?.name ?? "Team Test User",
      ...(options?.email === undefined ? {} : { email: options.email }),
      role: "customer",
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function teamOrgInsert(
  t: ReturnType<typeof convexTest>,
  options: { readonly handle: string; readonly status?: "pruefung" | "aktiv" | "gesperrt" },
): Promise<Id<"orgs">> {
  return await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("orgs", {
      orgHandle: options.handle,
      name: `Org ${options.handle}`,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("organizerDashboardOrganizations", {
      orgId,
      status: options.status ?? "aktiv",
      profile: { name: `Org ${options.handle}`, slug: options.handle, kind: "verein" },
      tax: { status: "regel", defaultRateBps: 1900 },
      fee: { percentBps: 0, fixedCents: 0, payer: "kaeufer" },
      configurationConfirmed: false,
      contracts: {},
      createdAt: now,
      updatedAt: now,
    })
    return orgId
  })
}

async function teamMemberInsert(
  t: ReturnType<typeof convexTest>,
  options: {
    readonly orgId: Id<"orgs">
    readonly userId: Id<"users">
    readonly handle: string
    readonly role?: "member" | "guest"
    readonly organizerRole?: TeamRole
    readonly invitedBy?: string
  },
): Promise<Id<"orgMembers">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("orgMembers", {
      orgId: options.orgId,
      userId: options.userId,
      orgHandle: options.handle,
      role: options.role ?? "member",
      ...(options.organizerRole === undefined ? {} : { organizerRole: options.organizerRole }),
      invitedBy: options.invitedBy ?? options.userId,
      createdAt: now,
      updatedAt: now,
    }),
  )
}

test("the owner invites a team member, and duplicate invitations and existing members are refused", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const memberId = await teamUserInsert(t, { email: "member@example.com" })
  const orgId = await teamOrgInsert(t, { handle: "team-org" })
  await teamMemberInsert(t, { orgId, userId: ownerId, handle: "team-org", organizerRole: "inhaber" })
  await teamMemberInsert(t, { orgId, userId: memberId, handle: "team-org" })
  const token = await testAuthSessionTokenCreate(t, ownerId, authSecret)

  const invited = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token,
    orgId,
    emails: ["Einladung@Example.com"],
    organizerRole: "eventmanager",
  })
  expect(invited.success).toBe(true)
  if (!invited.success) return
  expect(invited.data.invitations).toHaveLength(1)
  expect(invited.data.invitations[0]).toMatchObject({
    invitedEmail: "einladung@example.com",
    organizerRole: "eventmanager",
    status: "pending",
    deliveryState: "queued",
    deliveryAttempts: 0,
  })

  const duplicate = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token,
    orgId,
    emails: ["einladung@example.com"],
    organizerRole: "eventmanager",
  })
  expect(duplicate.success).toBe(false)

  const existingMember = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token,
    orgId,
    emails: ["member@example.com"],
    organizerRole: "eventmanager",
  })
  expect(existingMember.success).toBe(false)

  const invalidRole = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token,
    orgId,
    emails: ["anders@example.com"],
    organizerRole: "member",
  })
  expect(invalidRole.success).toBe(false)
})

test("only roles with the team permission may manage the team", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const orgId = await teamOrgInsert(t, { handle: "roles-org" })
  await teamMemberInsert(t, { orgId, userId: ownerId, handle: "roles-org", organizerRole: "inhaber" })
  const ownerToken = await testAuthSessionTokenCreate(t, ownerId, authSecret)

  const withoutPermission: TeamRole[] = ["eventmanager", "finanzen", "einlass"]
  for (const role of withoutPermission) {
    const userId = await teamUserInsert(t, { email: `${role}@example.com` })
    await teamMemberInsert(t, { orgId, userId, handle: "roles-org", organizerRole: role })
    const token = await testAuthSessionTokenCreate(t, userId, authSecret)
    const list = await t.query(teamApi.organizerDashboardTeam.organizerDashboardTeamMemberListQuery, {
      token,
      orgId,
      paginationOpts,
    })
    expect(list.success).toBe(false)
    const invite = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
      token,
      orgId,
      emails: ["nur@example.com"],
      organizerRole: "einlass",
    })
    expect(invite.success).toBe(false)
  }

  const adminId = await teamUserInsert(t, { email: "admin@example.com" })
  await teamMemberInsert(t, { orgId, userId: adminId, handle: "roles-org", organizerRole: "admin" })
  const adminToken = await testAuthSessionTokenCreate(t, adminId, authSecret)
  const adminList = await t.query(teamApi.organizerDashboardTeam.organizerDashboardTeamMemberListQuery, {
    token: adminToken,
    orgId,
    paginationOpts,
  })
  expect(adminList.success).toBe(true)
  if (!adminList.success) return
  expect(adminList.data.page.map((member) => member.organizerRole).sort()).toEqual(
    ["inhaber", "admin", "eventmanager", "finanzen", "einlass"].sort(),
  )

  const ownerList = await t.query(teamApi.organizerDashboardTeam.organizerDashboardTeamMemberListQuery, {
    token: ownerToken,
    orgId,
    paginationOpts,
  })
  expect(ownerList.success).toBe(true)
})

test("member and invitation ids of another organization are refused", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const otherId = await teamUserInsert(t, { email: "other@example.com" })
  const firstOrgId = await teamOrgInsert(t, { handle: "first-org" })
  const secondOrgId = await teamOrgInsert(t, { handle: "second-org" })
  await teamMemberInsert(t, { orgId: firstOrgId, userId: ownerId, handle: "first-org", organizerRole: "inhaber" })
  const otherMemberId = await teamMemberInsert(t, {
    orgId: secondOrgId,
    userId: otherId,
    handle: "second-org",
    organizerRole: "eventmanager",
  })
  const token = await testAuthSessionTokenCreate(t, ownerId, authSecret)

  const otherInvitation = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token,
    orgId: secondOrgId,
    emails: ["fremd@example.com"],
    organizerRole: "eventmanager",
  })
  expect(otherInvitation.success).toBe(false)

  const foreignMember = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamRoleUpdateMutation, {
    token,
    orgId: firstOrgId,
    memberId: otherMemberId,
    organizerRole: "admin",
  })
  expect(foreignMember.success).toBe(false)

  const foreignRemove = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamMemberRemoveMutation, {
    token,
    orgId: firstOrgId,
    memberId: otherMemberId,
  })
  expect(foreignRemove.success).toBe(false)
})

test("a refused invite batch leaves no invitation behind", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const memberId = await teamUserInsert(t, { email: "member@example.com" })
  const orgId = await teamOrgInsert(t, { handle: "batch-org" })
  await teamMemberInsert(t, { orgId, userId: ownerId, handle: "batch-org", organizerRole: "inhaber" })
  await teamMemberInsert(t, { orgId, userId: memberId, handle: "batch-org" })
  const token = await testAuthSessionTokenCreate(t, ownerId, authSecret)

  const refused = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token,
    orgId,
    emails: ["neu@example.com", "member@example.com"],
    organizerRole: "eventmanager",
  })
  expect(refused.success).toBe(false)

  const invitations = await t.run(async (ctx) =>
    ctx.db
      .query("organizerDashboardTeamInvitations")
      .withIndex("orgId", (q) => q.eq("orgId", orgId))
      .take(10),
  )
  expect(invitations).toHaveLength(0)
})

test("only the owner may invite the owner role", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const adminId = await teamUserInsert(t, { email: "admin@example.com" })
  const orgId = await teamOrgInsert(t, { handle: "owner-invite-org" })
  await teamMemberInsert(t, { orgId, userId: ownerId, handle: "owner-invite-org", organizerRole: "inhaber" })
  await teamMemberInsert(t, { orgId, userId: adminId, handle: "owner-invite-org", organizerRole: "admin" })
  const ownerToken = await testAuthSessionTokenCreate(t, ownerId, authSecret)
  const adminToken = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const adminInvitesOwner = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token: adminToken,
    orgId,
    emails: ["neuer-inhaber@example.com"],
    organizerRole: "inhaber",
  })
  expect(adminInvitesOwner.success).toBe(false)

  const adminInvitesItself = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token: adminToken,
    orgId,
    emails: ["admin@example.com"],
    organizerRole: "admin",
  })
  expect(adminInvitesItself.success).toBe(false)

  const ownerInvitesOwner = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token: ownerToken,
    orgId,
    emails: ["neuer-inhaber@example.com"],
    organizerRole: "inhaber",
  })
  expect(ownerInvitesOwner.success).toBe(true)
  if (!ownerInvitesOwner.success) return
  expect(ownerInvitesOwner.data.invitations[0]?.organizerRole).toBe("inhaber")
})

test("the owner role is protected: only the owner changes it and the last owner stays", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const adminId = await teamUserInsert(t, { email: "admin@example.com" })
  const orgId = await teamOrgInsert(t, { handle: "owner-org" })
  const ownerMemberId = await teamMemberInsert(t, {
    orgId,
    userId: ownerId,
    handle: "owner-org",
    organizerRole: "inhaber",
  })
  const adminMemberId = await teamMemberInsert(t, {
    orgId,
    userId: adminId,
    handle: "owner-org",
    organizerRole: "admin",
  })
  const ownerToken = await testAuthSessionTokenCreate(t, ownerId, authSecret)
  const adminToken = await testAuthSessionTokenCreate(t, adminId, authSecret)

  const adminChangesOwner = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamRoleUpdateMutation, {
    token: adminToken,
    orgId,
    memberId: ownerMemberId,
    organizerRole: "admin",
  })
  expect(adminChangesOwner.success).toBe(false)

  const adminRemovesOwner = await t.mutation(
    teamApi.organizerDashboardTeam.organizerDashboardTeamMemberRemoveMutation,
    { token: adminToken, orgId, memberId: ownerMemberId },
  )
  expect(adminRemovesOwner.success).toBe(false)

  const adminEscalatesItself = await t.mutation(
    teamApi.organizerDashboardTeam.organizerDashboardTeamRoleUpdateMutation,
    { token: adminToken, orgId, memberId: adminMemberId, organizerRole: "inhaber" },
  )
  expect(adminEscalatesItself.success).toBe(false)

  const lastOwnerDemotesItself = await t.mutation(
    teamApi.organizerDashboardTeam.organizerDashboardTeamRoleUpdateMutation,
    { token: ownerToken, orgId, memberId: ownerMemberId, organizerRole: "admin" },
  )
  expect(lastOwnerDemotesItself.success).toBe(false)

  const lastOwnerRemovesItself = await t.mutation(
    teamApi.organizerDashboardTeam.organizerDashboardTeamMemberRemoveMutation,
    { token: ownerToken, orgId, memberId: ownerMemberId },
  )
  expect(lastOwnerRemovesItself.success).toBe(false)

  const ownerAfterFailedChanges = await t.run(async (ctx) => ctx.db.get("orgMembers", ownerMemberId))
  expect(ownerAfterFailedChanges?.organizerRole).toBe("inhaber")

  const secondOwnerId = await teamUserInsert(t, { email: "second-owner@example.com" })
  await teamMemberInsert(t, {
    orgId,
    userId: secondOwnerId,
    handle: "owner-org",
    organizerRole: "inhaber",
  })
  const ownerDemotesItself = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamRoleUpdateMutation, {
    token: ownerToken,
    orgId,
    memberId: ownerMemberId,
    organizerRole: "admin",
  })
  expect(ownerDemotesItself.success).toBe(true)
})

test("removing the team role keeps the canonical membership of member and guest", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const memberId = await teamUserInsert(t, { email: "member@example.com" })
  const guestId = await teamUserInsert(t, { email: "guest@example.com" })
  const orgId = await teamOrgInsert(t, { handle: "membership-org" })
  await teamMemberInsert(t, { orgId, userId: ownerId, handle: "membership-org", organizerRole: "inhaber" })
  const teamMemberId = await teamMemberInsert(t, {
    orgId,
    userId: memberId,
    handle: "membership-org",
    role: "member",
    organizerRole: "eventmanager",
    invitedBy: ownerId,
  })
  const teamGuestId = await teamMemberInsert(t, {
    orgId,
    userId: guestId,
    handle: "membership-org",
    role: "guest",
    organizerRole: "einlass",
    invitedBy: ownerId,
  })
  const token = await testAuthSessionTokenCreate(t, ownerId, authSecret)

  const removedMember = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamMemberRemoveMutation, {
    token,
    orgId,
    memberId: teamMemberId,
  })
  expect(removedMember.success).toBe(true)
  if (!removedMember.success) return
  expect(removedMember.data.organizerRole).toBeNull()
  expect(removedMember.data.role).toBe("member")

  const removedGuest = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamMemberRemoveMutation, {
    token,
    orgId,
    memberId: teamGuestId,
  })
  expect(removedGuest.success).toBe(true)

  const storedMember = await t.run(async (ctx) => ctx.db.get("orgMembers", teamMemberId))
  expect(storedMember).not.toBeNull()
  expect(storedMember?.organizerRole).toBeUndefined()
  expect(storedMember?.role).toBe("member")
  expect(storedMember?.invitedBy).toBe(ownerId)

  const storedGuest = await t.run(async (ctx) => ctx.db.get("orgMembers", teamGuestId))
  expect(storedGuest).not.toBeNull()
  expect(storedGuest?.organizerRole).toBeUndefined()
  expect(storedGuest?.role).toBe("guest")
  expect(storedGuest?.invitedBy).toBe(ownerId)
})

test("an invitation is accepted only by the invited account and only once", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const inviteeId = await teamUserInsert(t, { email: "invitee@example.com" })
  const strangerId = await teamUserInsert(t, { email: "stranger@example.com" })
  const orgId = await teamOrgInsert(t, { handle: "accept-org" })
  await teamMemberInsert(t, { orgId, userId: ownerId, handle: "accept-org", organizerRole: "inhaber" })
  const token = await testAuthSessionTokenCreate(t, ownerId, authSecret)

  const invited = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token,
    orgId,
    emails: ["invitee@example.com"],
    organizerRole: "finanzen",
  })
  expect(invited.success).toBe(true)
  if (!invited.success) return
  const invitationId = invited.data.invitations[0]?.id
  expect(invitationId).toBeDefined()
  if (invitationId === undefined) return

  const strangerToken = await testAuthSessionTokenCreate(t, strangerId, authSecret)
  const strangerAccept = await t.mutation(
    teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationAcceptMutation,
    { token: strangerToken, invitationId },
  )
  expect(strangerAccept.success).toBe(false)

  const inviteeToken = await testAuthSessionTokenCreate(t, inviteeId, authSecret)
  const accepted = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationAcceptMutation, {
    token: inviteeToken,
    invitationId,
  })
  expect(accepted.success).toBe(true)
  if (!accepted.success) return
  expect(accepted.data.organizerRole).toBe("finanzen")

  const membership = await t.run(async (ctx) =>
    ctx.db
      .query("orgMembers")
      .withIndex("userIdOrgId", (q) => q.eq("userId", inviteeId).eq("orgId", orgId))
      .unique(),
  )
  expect(membership?.role).toBe("member")
  expect(membership?.organizerRole).toBe("finanzen")
  expect(membership?.invitedBy).toBe(ownerId)

  const replay = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationAcceptMutation, {
    token: inviteeToken,
    invitationId,
  })
  expect(replay.success).toBe(false)

  const invitation = await t.run(async (ctx) => ctx.db.get("organizerDashboardTeamInvitations", invitationId))
  expect(invitation?.status).toBe("accepted")
})

test("an existing member keeps the canonical role when an invitation is accepted", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const guestId = await teamUserInsert(t, { email: "guest@example.com" })
  const orgId = await teamOrgInsert(t, { handle: "guest-org" })
  await teamMemberInsert(t, { orgId, userId: ownerId, handle: "guest-org", organizerRole: "inhaber" })
  const token = await testAuthSessionTokenCreate(t, ownerId, authSecret)
  // Create the actual invitation first; canonical guest membership arrives later.
  const invited = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token,
    orgId,
    emails: ["guest@example.com"],
    organizerRole: "einlass",
  })
  expect(invited.success).toBe(true)
  if (!invited.success || !invited.data.invitations[0]) throw new Error("Expected guest invitation")
  const invitationId = invited.data.invitations[0].id
  await teamMemberInsert(t, { orgId, userId: guestId, handle: "guest-org", role: "guest", invitedBy: ownerId })

  const guestToken = await testAuthSessionTokenCreate(t, guestId, authSecret)
  const accepted = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationAcceptMutation, {
    token: guestToken,
    invitationId,
  })
  expect(accepted.success).toBe(true)

  const memberships = await t.run(async (ctx) =>
    ctx.db
      .query("orgMembers")
      .withIndex("userIdOrgId", (q) => q.eq("userId", guestId).eq("orgId", orgId))
      .take(2),
  )
  expect(memberships).toHaveLength(1)
  expect(memberships[0]?.role).toBe("guest")
  expect(memberships[0]?.organizerRole).toBe("einlass")
  expect(memberships[0]?.invitedBy).toBe(ownerId)
})

test("expired and revoked invitations cannot be accepted", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const inviteeId = await teamUserInsert(t, { email: "invitee@example.com" })
  const orgId = await teamOrgInsert(t, { handle: "expiry-org" })
  await teamMemberInsert(t, { orgId, userId: ownerId, handle: "expiry-org", organizerRole: "inhaber" })
  const token = await testAuthSessionTokenCreate(t, ownerId, authSecret)
  const inviteeToken = await testAuthSessionTokenCreate(t, inviteeId, authSecret)

  const revokedInvite = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token,
    orgId,
    emails: ["revoked@example.com"],
    organizerRole: "eventmanager",
  })
  expect(revokedInvite.success).toBe(true)
  if (!revokedInvite.success) return
  const revokedId = revokedInvite.data.invitations[0]?.id
  if (revokedId === undefined) return
  const revoked = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationRevokeMutation, {
    token,
    orgId,
    invitationId: revokedId,
  })
  expect(revoked.success).toBe(true)
  const revokedAccept = await t.mutation(
    teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationAcceptMutation,
    { token: inviteeToken, invitationId: revokedId },
  )
  expect(revokedAccept.success).toBe(false)

  const expiredInvite = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token,
    orgId,
    emails: ["expired@example.com"],
    organizerRole: "eventmanager",
  })
  expect(expiredInvite.success).toBe(true)
  if (!expiredInvite.success) return
  const expiredId = expiredInvite.data.invitations[0]?.id
  if (expiredId === undefined) return
  await t.run(async (ctx) =>
    ctx.db.patch("organizerDashboardTeamInvitations", expiredId, { expiresAt: "2020-01-01T00:00:00.000Z" }),
  )
  const expiredAccept = await t.mutation(
    teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationAcceptMutation,
    { token: inviteeToken, invitationId: expiredId },
  )
  expect(expiredAccept.success).toBe(false)
})

test("the invitation inbox shows only the invitations of the signed-in account", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const inviteeId = await teamUserInsert(t, { email: "invitee@example.com" })
  const otherId = await teamUserInsert(t, { email: "other@example.com" })
  const orgId = await teamOrgInsert(t, { handle: "inbox-org" })
  await teamMemberInsert(t, { orgId, userId: ownerId, handle: "inbox-org", organizerRole: "inhaber" })
  const token = await testAuthSessionTokenCreate(t, ownerId, authSecret)
  const invited = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token,
    orgId,
    emails: ["invitee@example.com", "other@example.com"],
    organizerRole: "eventmanager",
  })
  expect(invited.success).toBe(true)

  const inviteeToken = await testAuthSessionTokenCreate(t, inviteeId, authSecret)
  const inbox = await t.query(teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationInboxQuery, {
    token: inviteeToken,
    paginationOpts,
  })
  expect(inbox.success).toBe(true)
  if (!inbox.success) return
  expect(inbox.data.accountEmail).toBe("invitee@example.com")
  expect(inbox.data.page).toHaveLength(1)
  expect(inbox.data.page[0]?.invitedEmail).toBe("invitee@example.com")

  const otherToken = await testAuthSessionTokenCreate(t, otherId, authSecret)
  const otherInbox = await t.query(teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationInboxQuery, {
    token: otherToken,
    paginationOpts,
  })
  expect(otherInbox.success).toBe(true)
  if (!otherInbox.success) return
  expect(otherInbox.data.page).toHaveLength(1)
  expect(otherInbox.data.page[0]?.invitedEmail).toBe("other@example.com")
})

test("the manager list of open invitations stays hidden from accounts without the team permission", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const eventManagerId = await teamUserInsert(t, { email: "events@example.com" })
  const orgId = await teamOrgInsert(t, { handle: "roster-org" })
  await teamMemberInsert(t, { orgId, userId: ownerId, handle: "roster-org", organizerRole: "inhaber" })
  await teamMemberInsert(t, {
    orgId,
    userId: eventManagerId,
    handle: "roster-org",
    organizerRole: "eventmanager",
  })
  const token = await testAuthSessionTokenCreate(t, ownerId, authSecret)
  const eventManagerToken = await testAuthSessionTokenCreate(t, eventManagerId, authSecret)
  const invited = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token,
    orgId,
    emails: ["kandidat@example.com"],
    organizerRole: "eventmanager",
  })
  expect(invited.success).toBe(true)

  const ownerList = await t.query(teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationListQuery, {
    token,
    orgId,
    paginationOpts,
  })
  expect(ownerList.success).toBe(true)
  if (!ownerList.success) return
  expect(ownerList.data.page).toHaveLength(1)
  expect(ownerList.data.page[0]?.invitedEmail).toBe("kandidat@example.com")

  const denied = await t.query(teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationListQuery, {
    token: eventManagerToken,
    orgId,
    paginationOpts,
  })
  expect(denied.success).toBe(false)
})

test("an ambiguous membership is refused instead of being resolved by guesswork", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const orgId = await teamOrgInsert(t, { handle: "ambiguous-org" })
  await teamMemberInsert(t, { orgId, userId: ownerId, handle: "ambiguous-org", organizerRole: "inhaber" })
  await t.run(async (ctx) =>
    ctx.db.insert("orgMembers", {
      orgId,
      userId: ownerId,
      orgHandle: "ambiguous-org",
      role: "member",
      organizerRole: "inhaber",
      invitedBy: ownerId,
      createdAt: now,
      updatedAt: now,
    }),
  )
  const token = await testAuthSessionTokenCreate(t, ownerId, authSecret)
  const list = await t.query(teamApi.organizerDashboardTeam.organizerDashboardTeamMemberListQuery, {
    token,
    orgId,
    paginationOpts,
  })
  expect(list.success).toBe(false)
})

test("the delivery state is honest: without a mail provider the invitation is skipped, never sent", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const orgId = await teamOrgInsert(t, { handle: "delivery-org" })
  await teamMemberInsert(t, { orgId, userId: ownerId, handle: "delivery-org", organizerRole: "inhaber" })
  const token = await testAuthSessionTokenCreate(t, ownerId, authSecret)
  const invited = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token,
    orgId,
    emails: ["delivery@example.com"],
    organizerRole: "eventmanager",
  })
  expect(invited.success).toBe(true)
  if (!invited.success) return
  const invitationId = invited.data.invitations[0]?.id
  if (invitationId === undefined) return

  await t.finishAllScheduledFunctions(async () => {})
  const invitation = await t.run(async (ctx) => ctx.db.get("organizerDashboardTeamInvitations", invitationId))
  expect(invitation?.deliveryState).not.toBe("sent")
  expect(["skipped", "failed"]).toContain(invitation?.deliveryState)
  expect(invitation?.deliveryAttempts).toBe(1)
  expect(invitation?.deliveryReason).toBeDefined()
})

test("a resend reuses the invitation and a second delivery does not send twice", async () => {
  const t = convexTest(schema, modules)
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const orgId = await teamOrgInsert(t, { handle: "resend-org" })
  await teamMemberInsert(t, { orgId, userId: ownerId, handle: "resend-org", organizerRole: "inhaber" })
  const token = await testAuthSessionTokenCreate(t, ownerId, authSecret)
  const invited = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token,
    orgId,
    emails: ["resend@example.com"],
    organizerRole: "eventmanager",
  })
  expect(invited.success).toBe(true)
  if (!invited.success) return
  const invitationId = invited.data.invitations[0]?.id
  if (invitationId === undefined) return

  await t.finishAllScheduledFunctions(async () => {})
  const first = await t.run(async (ctx) => ctx.db.get("organizerDashboardTeamInvitations", invitationId))
  expect(first?.deliveryAttempts).toBe(1)

  const resend = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationResendMutation, {
    token,
    orgId,
    invitationId,
  })
  expect(resend.success).toBe(true)
  await t.finishAllScheduledFunctions(async () => {})
  const second = await t.run(async (ctx) => ctx.db.get("organizerDashboardTeamInvitations", invitationId))
  expect(second?.deliveryAttempts).toBe(2)
  expect(second?.status).toBe("pending")

  const invitationCount = await t.run(async (ctx) =>
    ctx.db
      .query("organizerDashboardTeamInvitations")
      .withIndex("orgId", (q) => q.eq("orgId", orgId))
      .take(10),
  )
  expect(invitationCount).toHaveLength(1)
})

/** Real invite creation; role changes below happen after the invitation exists. */
async function acceptanceFixture(role: TeamRole = "eventmanager") {
  const t = convexTest(schema, modules)
  const orgId = await teamOrgInsert(t, { handle: "regression-org" })
  const ownerId = await teamUserInsert(t, { email: "owner@example.com" })
  const inviteeId = await teamUserInsert(t, { email: "invitee@example.com" })
  const ownerMemberId = await teamMemberInsert(t, {
    orgId,
    userId: ownerId,
    handle: "regression-org",
    organizerRole: "inhaber",
  })
  const token = await testAuthSessionTokenCreate(t, ownerId, authSecret)
  const inviteeToken = await testAuthSessionTokenCreate(t, inviteeId, authSecret)
  const invited = await t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token,
    orgId,
    emails: ["invitee@example.com"],
    organizerRole: role,
  })
  expect(invited.success).toBe(true)
  if (!invited.success || !invited.data.invitations[0]) throw new Error("Expected real invitation")
  return {
    t,
    orgId,
    ownerId,
    ownerMemberId,
    inviteeId,
    token,
    inviteeToken,
    invitationId: invited.data.invitations[0].id,
  }
}

for (const stale of ["einlass", "admin", "revoked-role", "removed", "deleted", "missing", "ambiguous"] as const) {
  test(`acceptance revalidates the inviter in the grant transaction: ${stale}`, async () => {
    const h = await acceptanceFixture("inhaber")
    const secondId = await teamUserInsert(h.t, { email: "second@example.com" })
    await teamMemberInsert(h.t, {
      orgId: h.orgId,
      userId: secondId,
      handle: "regression-org",
      organizerRole: "inhaber",
    })
    if (stale === "einlass" || stale === "admin") {
      const changed = await h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamRoleUpdateMutation, {
        token: h.token,
        orgId: h.orgId,
        memberId: h.ownerMemberId,
        organizerRole: stale,
      })
      expect(changed.success).toBe(true)
    }
    if (stale === "revoked-role") {
      expect(
        (
          await h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamMemberRemoveMutation, {
            token: h.token,
            orgId: h.orgId,
            memberId: h.ownerMemberId,
          })
        ).success,
      ).toBe(true)
    }
    if (stale === "removed") await h.t.run((ctx) => ctx.db.delete("orgMembers", h.ownerMemberId))
    if (stale === "deleted") await h.t.run((ctx) => ctx.db.patch("users", h.ownerId, { deletedAt: now }))
    if (stale === "missing") await h.t.run((ctx) => ctx.db.delete("users", h.ownerId))
    if (stale === "ambiguous")
      await teamMemberInsert(h.t, { orgId: h.orgId, userId: h.ownerId, handle: "regression-org" })
    const accepted = await h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationAcceptMutation, {
      token: h.inviteeToken,
      invitationId: h.invitationId,
    })
    expect(accepted.success).toBe(false)
    expect(
      await h.t.run((ctx) =>
        ctx.db
          .query("orgMembers")
          .withIndex("userIdOrgId", (q) => q.eq("userId", h.inviteeId).eq("orgId", h.orgId))
          .take(2),
      ),
    ).toHaveLength(0)
    expect((await h.t.run((ctx) => ctx.db.get("organizerDashboardTeamInvitations", h.invitationId)))?.status).toBe(
      "pending",
    )
  })
}

test("a current admin may still grant non-owner invitations without an emailVerifiedAt field", async () => {
  const h = await acceptanceFixture("finanzen")
  const secondId = await teamUserInsert(h.t)
  await teamMemberInsert(h.t, { orgId: h.orgId, userId: secondId, handle: "regression-org", organizerRole: "inhaber" })
  expect(
    (
      await h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamRoleUpdateMutation, {
        token: h.token,
        orgId: h.orgId,
        memberId: h.ownerMemberId,
        organizerRole: "admin",
      })
    ).success,
  ).toBe(true)
  expect(
    (
      await h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationAcceptMutation, {
        token: h.inviteeToken,
        invitationId: h.invitationId,
      })
    ).success,
  ).toBe(true)
})

for (const stale of ["deleted", "tombstone", "ambiguous"] as const) {
  test(`last-owner demotion and removal ignore ${stale} owner candidates`, async () => {
    const h = await acceptanceFixture()
    const otherId = await teamUserInsert(h.t)
    await teamMemberInsert(h.t, { orgId: h.orgId, userId: otherId, handle: "regression-org", organizerRole: "inhaber" })
    if (stale === "deleted") await h.t.run((ctx) => ctx.db.delete("users", otherId))
    if (stale === "tombstone") await h.t.run((ctx) => ctx.db.patch("users", otherId, { deletedAt: now }))
    if (stale === "ambiguous")
      await teamMemberInsert(h.t, { orgId: h.orgId, userId: otherId, handle: "regression-org" })
    expect(
      (
        await h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamRoleUpdateMutation, {
          token: h.token,
          orgId: h.orgId,
          memberId: h.ownerMemberId,
          organizerRole: "admin",
        })
      ).success,
    ).toBe(false)
    expect(
      (
        await h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamMemberRemoveMutation, {
          token: h.token,
          orgId: h.orgId,
          memberId: h.ownerMemberId,
        })
      ).success,
    ).toBe(false)
    expect((await h.t.run((ctx) => ctx.db.get("orgMembers", h.ownerMemberId)))?.organizerRole).toBe("inhaber")
  })
}

test("concurrent owner self-demotions leave one usable owner", async () => {
  const h = await acceptanceFixture()
  const secondId = await teamUserInsert(h.t)
  const secondMemberId = await teamMemberInsert(h.t, {
    orgId: h.orgId,
    userId: secondId,
    handle: "regression-org",
    organizerRole: "inhaber",
  })
  const secondToken = await testAuthSessionTokenCreate(h.t, secondId, authSecret)
  const outcomes = await Promise.all([
    h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamRoleUpdateMutation, {
      token: h.token,
      orgId: h.orgId,
      memberId: h.ownerMemberId,
      organizerRole: "admin",
    }),
    h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamRoleUpdateMutation, {
      token: secondToken,
      orgId: h.orgId,
      memberId: secondMemberId,
      organizerRole: "admin",
    }),
  ])
  expect(outcomes.filter((result) => result.success)).toHaveLength(1)
  expect(
    await h.t.run((ctx) =>
      ctx.db
        .query("orgMembers")
        .withIndex("orgIdAndOrganizerRole", (q) => q.eq("orgId", h.orgId).eq("organizerRole", "inhaber"))
        .take(2),
    ),
  ).toHaveLength(1)
})

test("the owner probe finds a live unambiguous owner beyond stale indexed candidates", async () => {
  const h = await acceptanceFixture()
  for (const stale of ["tombstone", "ambiguous"] as const) {
    const userId = await teamUserInsert(h.t)
    await teamMemberInsert(h.t, { orgId: h.orgId, userId, handle: "regression-org", organizerRole: "inhaber" })
    if (stale === "tombstone") await h.t.run((ctx) => ctx.db.patch("users", userId, { deletedAt: now }))
    if (stale === "ambiguous") await teamMemberInsert(h.t, { orgId: h.orgId, userId, handle: "regression-org" })
  }
  const validId = await teamUserInsert(h.t)
  await teamMemberInsert(h.t, { orgId: h.orgId, userId: validId, handle: "regression-org", organizerRole: "inhaber" })
  expect(
    (
      await h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamRoleUpdateMutation, {
        token: h.token,
        orgId: h.orgId,
        memberId: h.ownerMemberId,
        organizerRole: "admin",
      })
    ).success,
  ).toBe(true)
})

test("the owner probe fails closed when its explicit budget is exhausted", async () => {
  const h = await acceptanceFixture()
  const deadId = await teamUserInsert(h.t)
  await h.t.run(async (ctx) => {
    await ctx.db.patch("users", deadId, { deletedAt: now })
    for (let index = 0; index < 100; index += 1)
      await ctx.db.insert("orgMembers", {
        orgId: h.orgId,
        userId: deadId,
        orgHandle: "regression-org",
        role: "member",
        organizerRole: "inhaber",
        invitedBy: h.ownerId,
        createdAt: now,
        updatedAt: now,
      })
  })
  const otherId = await teamUserInsert(h.t)
  await teamMemberInsert(h.t, { orgId: h.orgId, userId: otherId, handle: "regression-org", organizerRole: "inhaber" })
  const result = await h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamRoleUpdateMutation, {
    token: h.token,
    orgId: h.orgId,
    memberId: h.ownerMemberId,
    organizerRole: "admin",
  })
  expect(result.success).toBe(false)
  if (!result.success) expect(result.errorMessage).toContain("100-candidate budget")
})

test("claim / resend / claim cannot produce a second valid delivery payload", async () => {
  const h = await acceptanceFixture()
  const queuedResend = await h.t.mutation(
    teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationResendMutation,
    {
      token: h.token,
      orgId: h.orgId,
      invitationId: h.invitationId,
    },
  )
  expect(queuedResend.success).toBe(false)
  const first = await h.t.mutation(claimReference, { invitationId: h.invitationId })
  expect(first.success && first.data.status).toBe("claimed")
  const resend = await h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationResendMutation, {
    token: h.token,
    orgId: h.orgId,
    invitationId: h.invitationId,
  })
  expect(resend.success).toBe(false)
  const second = await h.t.mutation(claimReference, { invitationId: h.invitationId })
  expect(second.success && second.data).toEqual({ status: "skipped", reason: "already_claimed" })
  expect(first.success && first.data.status === "claimed" && first.data.attempt).toBe(1)
  const recorded = await h.t.mutation(recordReference, { invitationId: h.invitationId, attempt: 1, state: "sent" })
  expect(recorded.success && recorded.data.recorded).toBe(true)
  const replay = await h.t.mutation(recordReference, {
    invitationId: h.invitationId,
    attempt: 1,
    state: "failed",
    reason: "late",
  })
  expect(replay.success && replay.data.recorded).toBe(false)
})

for (const [invitedRole, currentRole] of [
  ["eventmanager", "finanzen"],
  ["finanzen", "eventmanager"],
  ["eventmanager", "einlass"],
  ["einlass", "eventmanager"],
  ["finanzen", "einlass"],
  ["einlass", "finanzen"],
  ["admin", "inhaber"],
] as const) {
  test(`acceptance never replaces the existing ${currentRole} role with invited ${invitedRole}`, async () => {
    const h = await acceptanceFixture(invitedRole)
    const memberId = await teamMemberInsert(h.t, {
      orgId: h.orgId,
      userId: h.inviteeId,
      handle: "regression-org",
      role: "guest",
      invitedBy: h.ownerId,
    })
    const changed = await h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamRoleUpdateMutation, {
      token: h.token,
      orgId: h.orgId,
      memberId,
      organizerRole: currentRole,
    })
    expect(changed.success).toBe(true)
    const accepted = await h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationAcceptMutation, {
      token: h.inviteeToken,
      invitationId: h.invitationId,
    })
    expect(accepted.success).toBe(false)
    const stored = await h.t.run((ctx) => ctx.db.get("orgMembers", memberId))
    expect(stored).toMatchObject({ role: "guest", organizerRole: currentRole, invitedBy: h.ownerId })
    expect((await h.t.run((ctx) => ctx.db.get("organizerDashboardTeamInvitations", h.invitationId)))?.status).toBe(
      "pending",
    )
  })
}

test("acceptance of the same existing team role is harmless and keeps membership metadata", async () => {
  const h = await acceptanceFixture("finanzen")
  const memberId = await teamMemberInsert(h.t, {
    orgId: h.orgId,
    userId: h.inviteeId,
    handle: "regression-org",
    role: "guest",
    organizerRole: "finanzen",
    invitedBy: h.ownerId,
  })
  const before = await h.t.run((ctx) => ctx.db.get("orgMembers", memberId))
  expect(
    (
      await h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInvitationAcceptMutation, {
        token: h.inviteeToken,
        invitationId: h.invitationId,
      })
    ).success,
  ).toBe(true)
  expect(await h.t.run((ctx) => ctx.db.get("orgMembers", memberId))).toEqual(before)
})

test("legacy mixed-case account emails are detected through canonical org memberships", async () => {
  const h = await acceptanceFixture()
  const legacyId = await teamUserInsert(h.t, { email: "MixedCase@Example.com" })
  await teamMemberInsert(h.t, { orgId: h.orgId, userId: legacyId, handle: "regression-org", organizerRole: "einlass" })
  const invite = await h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token: h.token,
    orgId: h.orgId,
    emails: ["mixedcase@example.com"],
    organizerRole: "eventmanager",
  })
  expect(invite.success).toBe(false)
  if (!invite.success) expect(invite.errorMessage).toContain("already a member")
})

test("legacy email membership checking fails explicitly beyond its roster budget", async () => {
  const h = await acceptanceFixture()
  await h.t.run(async (ctx) => {
    for (let index = 0; index < 200; index += 1)
      await ctx.db.insert("orgMembers", {
        orgId: h.orgId,
        userId: h.inviteeId,
        orgHandle: "regression-org",
        role: "guest",
        invitedBy: h.ownerId,
        createdAt: now,
        updatedAt: now,
      })
  })
  const result = await h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
    token: h.token,
    orgId: h.orgId,
    emails: ["new@example.com"],
    organizerRole: "einlass",
  })
  expect(result.success).toBe(false)
  if (!result.success) expect(result.errorMessage).toContain("200-membership budget")
})

test("eleven closed invitations do not block a twelfth; stale pending expires and live pending refuses duplicates", async () => {
  const h = await acceptanceFixture()
  await h.t.run(async (ctx) => {
    const original = await ctx.db.get("organizerDashboardTeamInvitations", h.invitationId)
    if (!original) throw new Error("Missing invitation")
    await ctx.db.patch("organizerDashboardTeamInvitations", original._id, { status: "revoked" })
    for (let index = 0; index < 10; index += 1)
      await ctx.db.insert("organizerDashboardTeamInvitations", {
        orgId: h.orgId,
        invitedEmail: "invitee@example.com",
        organizerRole: "eventmanager",
        status: index % 2 ? "accepted" : "expired",
        invitedByUserId: h.ownerId,
        expiresAt: "2020-01-01T00:00:00.000Z",
        deliveryState: "skipped",
        deliveryAttempts: 0,
        createdAt: now,
        updatedAt: now,
      })
  })
  const invite = () =>
    h.t.mutation(teamApi.organizerDashboardTeam.organizerDashboardTeamInviteMutation, {
      token: h.token,
      orgId: h.orgId,
      emails: ["invitee@example.com"],
      organizerRole: "einlass",
    })
  const twelfth = await invite()
  expect(twelfth.success).toBe(true)
  if (!twelfth.success || !twelfth.data.invitations[0]) throw new Error("Expected twelfth invitation")
  expect((await invite()).success).toBe(false)
  const id = twelfth.data.invitations[0].id
  await h.t.run((ctx) =>
    ctx.db.patch("organizerDashboardTeamInvitations", id, { expiresAt: "2020-01-01T00:00:00.000Z" }),
  )
  expect((await invite()).success).toBe(true)
  expect((await h.t.run((ctx) => ctx.db.get("organizerDashboardTeamInvitations", id)))?.status).toBe("expired")
  expect(
    await h.t.run((ctx) =>
      ctx.db
        .query("organizerDashboardTeamInvitations")
        .withIndex("orgId", (q) => q.eq("orgId", h.orgId))
        .take(20),
    ),
  ).toHaveLength(13)
})
