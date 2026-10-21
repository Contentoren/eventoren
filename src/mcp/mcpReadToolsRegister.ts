import * as a from "valibot"
import { api } from "#convex/_generated/api.js"
import type { ActionCtx } from "#convex/_generated/server.js"
import { mcpCatalogFilterSchema, mcpPaginationOptsSchema } from "#src/mcp/mcpToolSchemas.ts"
import type { McpToolDefinition } from "#src/mcp/mcpToolRegistry.ts"
import { mcpToolResult } from "#src/mcp/mcpToolRegistry.ts"

const apiKeyListMcpInput = a.object({
  paginationOpts: a.optional(mcpPaginationOptsSchema, { numItems: 50, cursor: null }),
})
const organizerEventListMcpInput = a.object({
  paginationOpts: a.optional(mcpPaginationOptsSchema, { numItems: 50, cursor: null }),
})
const catalogEventListMcpInput = a.object({
  filter: a.optional(mcpCatalogFilterSchema, { query: "", location: "", category: "", timeWindow: "alle" }),
  paginationOpts: a.optional(mcpPaginationOptsSchema, { numItems: 50, cursor: null }),
})

export function mcpReadToolDefinitions(ctx: ActionCtx, token: string): McpToolDefinition[] {
  return [
    {
      name: "apikey-list",
      description: "List your API keys with masked credentials and status.",
      inputSchema: apiKeyListMcpInput,
      run: async (toolArgs: { paginationOpts?: { numItems?: number; cursor?: string | null } }) => {
        const result = await ctx.runQuery(api.auth.apiKeyListQuery, {
          token,
          paginationOpts: {
            numItems: toolArgs.paginationOpts?.numItems ?? 50,
            cursor: toolArgs.paginationOpts?.cursor ?? null,
          },
        })
        return mcpToolResult(result, !result.success)
      },
    },
    {
      name: "organizer-event-list",
      description: "List events of your organizer account.",
      inputSchema: organizerEventListMcpInput,
      run: async (toolArgs: { paginationOpts?: { numItems?: number; cursor?: string | null } }) => {
        const result = await ctx.runQuery(api.organizer.organizerEventListQuery, {
          token,
          paginationOpts: {
            numItems: toolArgs.paginationOpts?.numItems ?? 50,
            cursor: toolArgs.paginationOpts?.cursor ?? null,
          },
        })
        return mcpToolResult(result, !result.success)
      },
    },
    {
      name: "organizer-event-get",
      description: "Get one of your events by key.",
      inputSchema: a.object({ eventKey: a.string() }),
      run: async (toolArgs: { eventKey: string }) => {
        const result = await ctx.runQuery(api.organizer.organizerEventGetQuery, { token, ...toolArgs })
        return mcpToolResult(result, !result.success)
      },
    },
    {
      name: "ticket-order-list-mine",
      description: "List your own ticket orders.",
      inputSchema: a.object({}),
      run: async () => {
        const result = await ctx.runQuery(api.ticketing.ticketOrderListMineQuery, { token })
        return mcpToolResult(result, !result.success)
      },
    },
    {
      name: "catalog-event-list-published",
      description: "List published public events with an optional filter.",
      inputSchema: catalogEventListMcpInput,
      run: async (toolArgs: {
        filter?: {
          query: string
          location: string
          category: string
          timeWindow: "alle" | "heute" | "wochenende" | "monat"
        }
        paginationOpts?: { numItems?: number; cursor?: string | null }
      }) => {
        const result = await ctx.runQuery(api.catalog.catalogEventListPublishedPageQuery, {
          filter: toolArgs.filter ?? { query: "", location: "", category: "", timeWindow: "alle" },
          paginationOpts: {
            numItems: toolArgs.paginationOpts?.numItems ?? 50,
            cursor: toolArgs.paginationOpts?.cursor ?? null,
          },
        })
        return mcpToolResult(result, !result.success)
      },
    },
  ]
}
