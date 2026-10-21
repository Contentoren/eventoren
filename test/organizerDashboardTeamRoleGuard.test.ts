import { expect, test } from "bun:test"
import { organizerDashboardTeamRoleGuard } from "#src/organizer/dashboard/team/organizerDashboardTeamRoleGuard.ts"

const owner = { actorRole: "inhaber", actorMemberId: "owner-member" } as const
const admin = { actorRole: "admin", actorMemberId: "admin-member" } as const

test("only the owner may grant, change or remove the owner role", () => {
  const granted = organizerDashboardTeamRoleGuard({
    ...admin,
    targetMemberId: "other-member",
    targetRole: "eventmanager",
    nextRole: "inhaber",
  })
  expect(granted.success).toBe(false)

  const changed = organizerDashboardTeamRoleGuard({
    ...admin,
    targetMemberId: "owner-member",
    targetRole: "inhaber",
    nextRole: "admin",
  })
  expect(changed.success).toBe(false)

  const removed = organizerDashboardTeamRoleGuard({
    ...admin,
    targetMemberId: "owner-member",
    targetRole: "inhaber",
    nextRole: null,
  })
  expect(removed.success).toBe(false)

  const allowed = organizerDashboardTeamRoleGuard({
    ...owner,
    targetMemberId: "other-member",
    targetRole: "eventmanager",
    nextRole: "inhaber",
  })
  expect(allowed.success).toBe(true)
})

test("nobody may escalate their own role", () => {
  const selfEscalation = organizerDashboardTeamRoleGuard({
    ...admin,
    targetMemberId: "admin-member",
    targetRole: "admin",
    nextRole: "inhaber",
  })
  expect(selfEscalation.success).toBe(false)

  const selfDemotion = organizerDashboardTeamRoleGuard({
    ...admin,
    targetMemberId: "admin-member",
    targetRole: "admin",
    nextRole: "eventmanager",
  })
  expect(selfDemotion.success).toBe(true)
})

test("self-change compares actual permissions, not a total ranking of incomparable roles", () => {
  for (const [targetRole, nextRole] of [
    ["eventmanager", "finanzen"],
    ["finanzen", "eventmanager"],
    ["finanzen", "einlass"],
    ["einlass", "finanzen"],
  ] as const) {
    expect(
      organizerDashboardTeamRoleGuard({
        actorRole: targetRole,
        actorMemberId: "self",
        targetMemberId: "self",
        targetRole,
        nextRole,
      }).success,
    ).toBe(false)
  }
  expect(
    organizerDashboardTeamRoleGuard({
      actorRole: "eventmanager",
      actorMemberId: "self",
      targetMemberId: "self",
      targetRole: "eventmanager",
      nextRole: "einlass",
    }).success,
  ).toBe(true)
})
