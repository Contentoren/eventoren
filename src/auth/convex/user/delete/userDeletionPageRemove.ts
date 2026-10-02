import type { MutationCtx } from "#convex/_generated/server.js"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { userDeleteHardOtps } from "#src/auth/convex/user/delete_hard/userDeleteHardOtps.ts"
import { userDeleteHardAuthAccounts } from "#src/auth/convex/user/delete_hard_parts/userDeleteHardAuthAccounts.ts"
import { userDeleteHardAuthSessions } from "#src/auth/convex/user/delete_hard_parts/userDeleteHardAuthSessions.ts"
import { userDeleteHardEmailLoginCodes } from "#src/auth/convex/user/delete_hard_parts/userDeleteHardEmailLoginCodes.ts"
import { userDeleteHardFiles } from "#src/auth/convex/user/delete_hard_parts/userDeleteHardFiles.ts"
import { userDeleteHardInvitations } from "#src/auth/convex/user/delete_hard_parts/userDeleteHardInvitations.ts"
import { userDeleteHardOrgMemberships } from "#src/auth/convex/user/delete_hard_parts/userDeleteHardOrgMemberships.ts"

const phases = ["sessions", "otps", "codes", "memberships", "invitations", "files", "accounts"] as const
const removers = {
  sessions: userDeleteHardAuthSessions,
  otps: userDeleteHardOtps,
  codes: userDeleteHardEmailLoginCodes,
  memberships: userDeleteHardOrgMemberships,
  invitations: userDeleteHardInvitations,
  files: userDeleteHardFiles,
  accounts: userDeleteHardAuthAccounts,
}

export async function userDeletionPageRemove(
  ctx: MutationCtx,
  args: {
    userId: IdUser
    hard: boolean
    phase: (typeof phases)[number]
    cursor: string | null
  },
) {
  // Exactly one database page per transaction, including legacy table scans.
  const page = await removers[args.phase](ctx, args.userId, args.cursor)
  if (!page.isDone) return { ...args, cursor: page.continueCursor }
  if (!args.hard) return null
  const phase = phases[phases.indexOf(args.phase) + 1]
  if (!phase) return null
  return { ...args, phase, cursor: null }
}
