import { api } from "#convex/_generated/api.js"
import type { ActionCtx } from "#convex/_generated/server.js"
import { apiKeyCreateInputSchema } from "#src/auth/model/apiKeyCreateInputSchema.ts"
import { apiKeyRenameInputSchema } from "#src/auth/model/apiKeyRenameInputSchema.ts"
import { apiKeyRevokeInputSchema } from "#src/auth/model/apiKeyRevokeInputSchema.ts"
import { apiKeyRotateInputSchema } from "#src/auth/model/apiKeyRotateInputSchema.ts"
import { mcpInputWithoutToken } from "#src/mcp/mcpInputWithoutToken.ts"
import type { McpToolDefinition } from "#src/mcp/mcpToolRegistry.ts"
import { mcpToolResult } from "#src/mcp/mcpToolRegistry.ts"

const apiKeyCreateMcpInput = mcpInputWithoutToken(apiKeyCreateInputSchema)
const apiKeyRenameMcpInput = mcpInputWithoutToken(apiKeyRenameInputSchema)
const apiKeyRevokeMcpInput = mcpInputWithoutToken(apiKeyRevokeInputSchema)
const apiKeyRotateMcpInput = mcpInputWithoutToken(apiKeyRotateInputSchema)

export function mcpWriteToolDefinitions(ctx: ActionCtx, token: string): McpToolDefinition[] {
  return [
    {
      name: "apikey-create",
      description: "Create an API key. The credential is returned once.",
      inputSchema: apiKeyCreateMcpInput,
      run: async (toolArgs: { name: string; expiryPreset?: never }) => {
        const result = await ctx.runMutation(api.auth.apiKeyCreateMutation, { token, ...toolArgs })
        return mcpToolResult(result, !result.success)
      },
    },
    {
      name: "apikey-rename",
      description: "Rename one of your API keys.",
      inputSchema: apiKeyRenameMcpInput,
      run: async (toolArgs: { id: string; name: string }) => {
        const result = await ctx.runMutation(api.auth.apiKeyRenameMutation, {
          token,
          id: toolArgs.id as never,
          name: toolArgs.name,
        })
        return mcpToolResult(result, !result.success)
      },
    },
    {
      name: "apikey-revoke",
      description: "Revoke one of your API keys.",
      inputSchema: apiKeyRevokeMcpInput,
      run: async (toolArgs: { id: string }) => {
        const result = await ctx.runMutation(api.auth.apiKeyRevokeMutation, {
          token,
          id: toolArgs.id as never,
        })
        return mcpToolResult(result, !result.success)
      },
    },
    {
      name: "apikey-rotate",
      description: "Rotate one of your API keys. The new credential is returned once.",
      inputSchema: apiKeyRotateMcpInput,
      run: async (toolArgs: { id: string }) => {
        const result = await ctx.runMutation(api.auth.apiKeyRotateMutation, {
          token,
          id: toolArgs.id as never,
        })
        return mcpToolResult(result, !result.success)
      },
    },
  ]
}
