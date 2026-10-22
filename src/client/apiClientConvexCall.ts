import type { ConvexHttpClient } from "convex/browser"
import {
  convexFunctionCallIsPublic,
  convexFunctionCallResolve,
  convexFunctionArgsWithToken,
  convexFunctionReferenceLookup,
  convexFunctionCallDispatch,
  type ConvexFunctionCallTarget,
} from "#src/utils/convex_client/convexFunctionCall.ts"
import { convexCallArgsParse } from "#src/utils/convex_client/convexCallSchemas.ts"
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
  let args: Record<string, unknown>
  try {
    args = convexCallArgsParse(input.args ?? {})
  } catch {
    return {
      success: false,
      error: {
        status: 400,
        message: `Invalid args for "${input.module}:${input.name}": expected an object`,
      },
    }
  }
  const argsWithToken = convexFunctionArgsWithToken(resolved, args, input.token)
  const reference = convexFunctionReferenceLookup(resolved)
  if (!reference) {
    return {
      success: false,
      error: { status: 503, message: `Missing Convex reference for "${input.module}:${input.name}"` },
    }
  }
  try {
    const data = await convexFunctionCallDispatch(resolved, reference, argsWithToken, {
      query: (queryReference, queryArgs) => client.query(queryReference, queryArgs),
      mutation: (mutationReference, mutationArgs) => client.mutation(mutationReference, mutationArgs),
      action: (actionReference, actionArgs) => client.action(actionReference, actionArgs),
    })
    return { success: true, data }
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
