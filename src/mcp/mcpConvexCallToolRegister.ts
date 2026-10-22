import * as a from "valibot"
import { api } from "#convex/_generated/api.js"
import type { ActionCtx } from "#convex/_generated/server.js"
import {
  convexFunctionCallIsPublic,
  convexFunctionCallResolve,
  convexFunctionArgsWithToken,
} from "#src/utils/convex_client/convexFunctionCall.ts"
import type { McpToolDefinition } from "#src/mcp/mcpToolRegistry.ts"
import { mcpToolError, mcpToolResult } from "#src/mcp/mcpToolRegistry.ts"

const convexCallMcpInput = a.object({
  module: a.string(),
  function: a.string(),
  args: a.optional(a.record(a.string(), a.unknown()), {}),
})

/**
 * Generic `convex-call` tool reaching every public Convex function via the
 * static catalog. The caller's credential (Bearer token resolved by the MCP
 * handler) is injected as the `token` arg only for functions whose args
 * declare one. Internal functions are refused: invoked through ctx they
 * would run with system privileges, bypassing credential checks.
 */
export function mcpConvexCallToolDefinitions(ctx: ActionCtx, token: string): McpToolDefinition[] {
  return [
    {
      name: "convex-call",
      description:
        "Call any public Convex function by module and name (see convexFunctionCatalog; e.g. catalog/catalogEventListPublishedPageQuery). Args are passed as-is; the credential is added as 'token' only when the function accepts one.",
      inputSchema: convexCallMcpInput,
      run: async (toolArgs: { module: string; function: string; args?: Record<string, unknown> }) => {
        const resolved = convexFunctionCallResolve({ module: toolArgs.module, name: toolArgs.function })
        if (!resolved) {
          return mcpToolError(-32602, `Unknown Convex function "${toolArgs.module}:${toolArgs.function}"`)
        }
        if (!convexFunctionCallIsPublic(resolved)) {
          return mcpToolError(
            -32602,
            `Internal Convex function "${toolArgs.module}:${toolArgs.function}" is not agent-reachable`,
          )
        }
        const args = convexFunctionArgsWithToken(resolved, toolArgs.args ?? {}, token)
        try {
          const reference = (api as unknown as Record<string, Record<string, unknown>>)[resolved.module]?.[
            resolved.name
          ] as never
          const result =
            resolved.kind === "query"
              ? await ctx.runQuery(reference as never, args as never)
              : resolved.kind === "mutation"
                ? await ctx.runMutation(reference as never, args as never)
                : await ctx.runAction(reference as never, args as never)
          return mcpToolResult(result, false)
        } catch (error) {
          return mcpToolError(-32603, error instanceof Error ? error.message : String(error))
        }
      },
    },
  ]
}
