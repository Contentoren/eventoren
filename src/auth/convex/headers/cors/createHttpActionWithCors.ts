import { type ActionCtx, httpAction } from "#convex/_generated/server.js"
import { setHeaderCors } from "#src/auth/convex/headers/cors/setHeaderCors.ts"

export function createHttpActionWithCors(originalHandler: (ctx: ActionCtx, request: Request) => Promise<Response>) {
  return httpAction(async (ctx, request) => {
    const response = await originalHandler(ctx, request)
    return setHeaderCors(request, response)
  })
}
