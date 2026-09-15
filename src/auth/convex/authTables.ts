import { defineTable } from "convex/server"
import { v } from "convex/values"
import { vIdUser } from "#src/auth/convex/vIdUser.ts"
import { loginMethodValidator } from "#src/auth/model_field/loginMethodValidator.ts"
import { otpPurposeValidator } from "#src/auth/model_field/otpPurpose.ts"
import { userRoleSourceValidator } from "#src/auth/model_field/userRoleSourceValidator.ts"
import { userRoleValidator } from "#src/auth/model_field/userRoleValidator.ts"
import { zitadelRoleValidator } from "#src/auth/model_field/zitadelRoleValidator.ts"
import { fieldsConvexCreatedAtUpdatedAt } from "#src/utils/data/fieldsConvexCreatedAtUpdatedAt.ts"
import { fieldsConvexCreatedAtUpdatedAtDeletedAt } from "#src/utils/data/fieldsConvexCreatedAtUpdatedAtDeletedAt.ts"

export const authTables = {
  users: defineTable({
    name: v.string(),
    username: v.optional(v.string()),
    image: v.optional(v.string()),
    bio: v.optional(v.string()),
    url: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerifiedAt: v.optional(v.string()),
    hashedPassword: v.optional(v.string()),
    role: userRoleValidator,
    roleSource: v.optional(userRoleSourceValidator),
    zitadelUserId: v.optional(v.string()),
    zitadelRoles: v.optional(v.array(zitadelRoleValidator)),
    zitadelRolesSynchronizedAt: v.optional(v.string()),
    organizerInvitedAt: v.optional(v.string()),
    ...fieldsConvexCreatedAtUpdatedAtDeletedAt,
  })
    //
    .index("email", ["email"])
    .index("username", ["username"])
    .index("zitadelUserId", ["zitadelUserId"]),

  authAccounts: defineTable({
    userId: vIdUser,
    provider: v.string(),
    providerAccountId: v.string(),
    ...fieldsConvexCreatedAtUpdatedAt,
  })
    //
    .index("userIdAndProvider", ["userId", "provider"])
    .index("providerAndAccountId", ["provider", "providerAccountId"]),

  authSessions: defineTable({
    userId: vIdUser,
    loginMethod: v.union(loginMethodValidator),
    token: v.string(),
    expiresAt: v.string(),
    ...fieldsConvexCreatedAtUpdatedAtDeletedAt,
  })
    //
    .index("userId", ["userId"])
    .index("token", ["token"]),

  authRateLimits: defineTable({
    identifier: v.string(),
    attemptsLeft: v.number(),
    lastAttemptedAt: v.number(),
  })
    //
    .index("identifier", ["identifier"]),

  authUserEmailRegistrations: defineTable({
    email: v.string(),
    code: v.string(),
    name: v.string(),
    hashedPassword: v.optional(v.string()),
    createdAt: v.string(),
    consumedAt: v.optional(v.string()),
  })
    //
    .index("emailCode", ["email", "code"]),

  authEmailLoginCodes: defineTable({
    userId: vIdUser,
    code: v.string(),
    email: v.string(),
    createdAt: v.string(),
    consumedAt: v.optional(v.string()),
  })
    //
    .index("emailCode", ["email", "code"]),

  authOtps: defineTable({
    userId: vIdUser,
    name: v.string(),
    email: v.string(),
    code: v.string(),
    purpose: otpPurposeValidator,
    createdAt: v.string(),
    consumedAt: v.optional(v.string()),
  })
    //
    .index("emailCode", ["email", "code"]),
} as const
