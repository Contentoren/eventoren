import type { ActionCtx } from "#convex/_generated/server.js"
import type { McpToolDefinition } from "#src/mcp/mcpToolRegistry.ts"
import { mcpToolError, mcpToolResult } from "#src/mcp/mcpToolRegistry.ts"
import { type McpConvexCallInput, mcpConvexCallInputSchema } from "#src/utils/convex_client/convexCallSchemas.ts"
import {
  convexFunctionArgsWithToken,
  convexFunctionCallDispatch,
  convexFunctionCallIsPublic,
  convexFunctionCallResolve,
  convexFunctionReferenceLookup,
} from "#src/utils/convex_client/convexFunctionCall.ts"

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
      inputSchema: mcpConvexCallInputSchema,
      run: async (toolArgs: McpConvexCallInput) => {
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
        const reference = convexFunctionReferenceLookup(resolved)
        if (!reference) {
          return mcpToolError(-32603, `Missing Convex reference for "${toolArgs.module}:${toolArgs.function}"`)
        }
        try {
          const result = await convexFunctionCallDispatch(resolved, reference, args, {
            query: (queryReference, queryArgs) => ctx.runQuery(queryReference, queryArgs),
            mutation: (mutationReference, mutationArgs) => ctx.runMutation(mutationReference, mutationArgs),
            action: (actionReference, actionArgs) => ctx.runAction(actionReference, actionArgs),
          })
          return mcpToolResult(result)
        } catch (error) {
          return mcpToolError(-32603, error instanceof Error ? error.message : String(error))
        }
      },
    },
  ]
}
