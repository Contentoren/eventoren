import type { convexTest } from "convex-test"
import type { Id } from "../convex/_generated/dataModel.js"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"

export async function testAuthSessionTokenCreate(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  authSecret: string,
): Promise<string> {
  const now = new Date().toISOString()
  const token = await createToken(userId, authSecret)
  await t.run(async (ctx) =>
    ctx.db.insert("authSessions", {
      userId,
      loginMethod: "dev",
      token,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    }),
  )
  return token
}
