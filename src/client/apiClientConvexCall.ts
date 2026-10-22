import { api } from "#convex/_generated/api.js"
import type { ConvexHttpClient } from "convex/browser"
import {
  convexFunctionCallIsPublic,
  convexFunctionCallResolve,
  convexFunctionArgsWithToken,
  type ConvexFunctionCallTarget,
} from "#src/utils/convex_client/convexFunctionCall.ts"
import { apiClientCreate, type ApiClientResult } from "./apiClient.js"

export type ApiClientConvexCallInput = ConvexFunctionCallTarget & {
  /** Args passed to the Convex function. A `token` field is injected only when provided here or via `token`. */
  readonly args?: Record<string, unknown>
  /** Caller credential, injected as `token` when the catalog proves the function accepts one. */
  readonly token?: string
}

/**
 * Generic typed entrypoint reaching every public Convex function
 * (convex/*.ts). The static catalog validates module/name/kind before any
 * network call; internal functions are refused because they bypass
 * credential checks. Prefer the focused wrappers in apiClient.ts and
 * organizerDashboardClientCreate.ts when one exists; use this for full
 * coverage of the remaining 180+ functions.
 */
export async function apiClientConvexCall(
  input: ApiClientConvexCallInput,
  client: ConvexHttpClient = apiClientCreate(),
): Promise<ApiClientResult<unknown>> {
  const resolved = convexFunctionCallResolve({ module: input.module, name: input.name })
  if (!resolved) {
    return {
      success: false,
      error: { status: 404, message: `Unknown Convex function "${input.module}:${input.name}"` },
    }
  }
  if (!convexFunctionCallIsPublic(resolved)) {
    return {
      success: false,
      error: {
        status: 403,
        message: `Internal Convex function "${input.module}:${input.name}" is not agent-reachable`,
      },
    }
  }
  const args = convexFunctionArgsWithToken(resolved, input.args ?? {}, input.token)
  try {
    const reference = (api as unknown as Record<string, Record<string, unknown>>)[resolved.module]?.[
      resolved.name
    ] as never
    const data =
      resolved.kind === "query"
        ? await client.query(reference, args as never)
        : resolved.kind === "mutation"
          ? await client.mutation(reference, args as never)
          : await client.action(reference, args as never)
    return { success: true, data: data as unknown }
  } catch (error) {
    return {
      success: false,
      error: {
        status: 503,
        message: error instanceof Error ? error.message : String(error),
      },
    }
  }
}
