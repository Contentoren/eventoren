import { v } from "convex/values"
import { internalQuery, type QueryCtx } from "#convex/_generated/server.js"
import type { PromiseResult } from "#result"
import type { ResolvedCredential } from "#src/utils/convex_backend/ResolvedCredential.ts"
import { authCredentialResolve } from "#src/utils/convex_backend/authCredentialResolve.ts"

export const apiKeyCredentialResolveQuery = internalQuery({
  args: { credential: v.string() },
  handler: (ctx, args) => apiKeyCredentialResolveQueryFn(ctx, args.credential),
})

async function apiKeyCredentialResolveQueryFn(ctx: QueryCtx, credential: string): PromiseResult<ResolvedCredential> {
  return authCredentialResolve(ctx, credential)
}
