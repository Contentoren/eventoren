import type { HttpRouter } from "convex/server"
import type { ActionCtx } from "#convex/_generated/server.js"
import { corsOptionsHttpHandler } from "#src/auth/convex/headers/cors/corsOptionsHttpHandler.ts"
import { createHttpActionWithCors } from "#src/auth/convex/headers/cors/createHttpActionWithCors.ts"
import type { HttpMethod } from "#src/auth/convex/headers/httpMethod.ts"

export type ConvexHandlerType = (ctx: ActionCtx, request: Request) => Promise<Response>

export function addRouteWithCors(
  http: HttpRouter,
  path: string,
  method: HttpMethod,
  handler: ConvexHandlerType,
): HttpRouter {
  const corsHandler = createHttpActionWithCors(handler)
  http.route({
    path,
    method,
    handler: corsHandler,
  })
  http.route({
    path,
    method: "OPTIONS",
    handler: corsOptionsHttpHandler,
  })
  return http
}
