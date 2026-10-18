import { paginationOptsValidator } from "convex/server"
import { type QueryCtx, query } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import type { IdUser } from "#src/auth/convex/IdUser.ts"
import { apiKeyCredentialMask } from "#src/auth/model/apiKeyCredentialMask.ts"
import { authQueryCredentialToUserId } from "#src/utils/convex_backend/authQueryCredentialToUserId.ts"
import { createTokenValidator } from "#src/utils/convex_backend/createTokenValidator.ts"

const argsValidator = createTokenValidator({ paginationOpts: paginationOptsValidator })

export const apiKeyListQuery = query({
  args: argsValidator,
  handler: async (ctx, args) => authQueryCredentialToUserId(ctx, args, apiKeyListQueryFn),
})

async function apiKeyListQueryFn(
  ctx: QueryCtx,
  args: { userId: IdUser; paginationOpts: { numItems: number; cursor: string | null } },
): PromiseResult<unknown> {
  const rows = await ctx.db
    .query("authApiKeys")
    .withIndex("userId", (q) => q.eq("userId", args.userId))
    .order("desc")
    .paginate(args.paginationOpts)
  return createResult({
    ...rows,
    page: rows.page.map(({ _id, name, previewFirst3, previewLast3, createdAt, expiresAt, revokedAt, expiredAt }) => ({
      id: _id,
      name,
      maskedCredential: apiKeyCredentialMask(previewFirst3, previewLast3),
      createdAt,
      expiresAt,
      revokedAt,
      status: revokedAt
        ? "revoked"
        : expiredAt || (expiresAt && Date.parse(expiresAt) <= Date.now())
          ? "expired"
          : "active",
    })),
  })
}
