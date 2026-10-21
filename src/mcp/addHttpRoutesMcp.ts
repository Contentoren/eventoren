import type { HttpRouter } from "convex/server"
import { addRouteWithCors } from "#src/auth/convex/headers/cors/addRouteWithCors.ts"
import { httpMethod } from "#src/auth/convex/headers/httpMethod.ts"
import { mcpHttpHandler } from "#src/mcp/mcpHttpHandler.ts"

export function addHttpRoutesMcp(http: HttpRouter): HttpRouter {
  addRouteWithCors(http, "/mcp", httpMethod.POST, mcpHttpHandler)
  return http
}
