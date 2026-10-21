import type { HttpRouter } from "convex/server"
import type { Id } from "#convex/_generated/dataModel.js"
import * as va from "valibot"
import { api } from "#convex/_generated/api.js"
import type { ActionCtx } from "#convex/_generated/server.js"
import { createResultError } from "#result"
import { addRouteWithCors } from "#src/auth/convex/headers/cors/addRouteWithCors.ts"
import { httpMethod } from "#src/auth/convex/headers/httpMethod.ts"
import { apiKeyCreateInputSchema } from "#src/auth/model/apiKeyCreateInputSchema.ts"
import { apiKeyHttpRoutePath } from "#src/auth/model/apiKeyHttpRoutePath.ts"
import { apiKeyListInputSchema } from "#src/auth/model/apiKeyListInputSchema.ts"
import { apiKeyRenameInputSchema } from "#src/auth/model/apiKeyRenameInputSchema.ts"
import { apiKeyRevokeInputSchema } from "#src/auth/model/apiKeyRevokeInputSchema.ts"
import { apiKeyRotateInputSchema } from "#src/auth/model/apiKeyRotateInputSchema.ts"
import { authActionCredentialResolve } from "#src/utils/convex_backend/authActionCredentialResolve.ts"
import { jsonStringifyPretty } from "#utils/json/jsonStringifyPretty.js"

const errorHeaders = { "Cache-Control": "no-store", "Content-Type": "application/json" }
const successHeaders = { "Content-Type": "application/json" }
const keyListMaxPageSize = 100

function bearerTokenGet(request: Request): string | null {
  const header = request.headers.get("authorization")
  if (header) {
    const match = /^Bearer (.+)$/.exec(header.trim())
    if (match?.[1]) return match[1]
  }
  return null
}

async function credentialTokenResolve(
  ctx: ActionCtx,
  request: Request,
  bodyToken: unknown,
): Promise<{ token: string } | Response> {
  const op = "apiKeyHttpRoutes"
  const token = bearerTokenGet(request) ?? (typeof bodyToken === "string" ? bodyToken : null)
  if (!token) {
    return new Response(jsonStringifyPretty(createResultError(op, "Unauthorized")), {
      status: 401,
      headers: errorHeaders,
    })
  }
  const credential = await authActionCredentialResolve(ctx, token)
  if (!credential.success) {
    return new Response(jsonStringifyPretty(createResultError(op, "Unauthorized")), {
      status: 401,
      headers: errorHeaders,
    })
  }
  return { token }
}

async function bodyRead(request: Request): Promise<Record<string, unknown> | Response> {
  const op = "apiKeyHttpRoutes"
  const value: unknown = await request.json().catch(() => null)
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return new Response(jsonStringifyPretty(createResultError(op, "Invalid JSON body")), {
      status: 400,
      headers: errorHeaders,
    })
  }
  return value as Record<string, unknown>
}

export function apiKeyHttpRoutesAdd(http: HttpRouter): HttpRouter {
  addRouteWithCors(http, apiKeyHttpRoutePath.keyList, httpMethod.GET, async (ctx, request) => {
    const op = "apiKeyListHttpHandler"
    const query = new URL(request.url).searchParams
    const auth = await credentialTokenResolve(ctx, request, query.get("token"))
    if (auth instanceof Response) return auth
    const parsed = va.safeParse(apiKeyListInputSchema, {
      token: auth.token,
      paginationOpts: {
        numItems: Number(query.get("numItems") ?? 50),
        cursor: query.get("cursor"),
      },
    })
    if (!parsed.success) {
      return new Response(jsonStringifyPretty(createResultError(op, va.summarize(parsed.issues))), {
        status: 400,
        headers: errorHeaders,
      })
    }
    if (parsed.output.paginationOpts.numItems > keyListMaxPageSize) {
      return new Response(
        jsonStringifyPretty(createResultError(op, "numItems must be between 1 and 100")),
        { status: 400, headers: errorHeaders },
      )
    }
    const result = await ctx.runQuery(api.auth.apiKeyListQuery, parsed.output)
    return new Response(jsonStringifyPretty(result), {
      status: result.success ? 200 : 400,
      headers: result.success ? successHeaders : errorHeaders,
    })
  })

  addRouteWithCors(http, apiKeyHttpRoutePath.keyCreate, httpMethod.POST, async (ctx, request) => {
    const op = "apiKeyCreateHttpHandler"
    const body = await bodyRead(request)
    if (body instanceof Response) return body
    const auth = await credentialTokenResolve(ctx, request, body.token)
    if (auth instanceof Response) return auth
    const parsed = va.safeParse(apiKeyCreateInputSchema, { ...body, token: auth.token })
    if (!parsed.success) {
      return new Response(jsonStringifyPretty(createResultError(op, va.summarize(parsed.issues))), {
        status: 400,
        headers: errorHeaders,
      })
    }
    const result = await ctx.runMutation(api.auth.apiKeyCreateMutation, parsed.output)
    return new Response(jsonStringifyPretty(result), {
      status: result.success ? 200 : 400,
      headers: result.success ? successHeaders : errorHeaders,
    })
  })

  addRouteWithCors(http, apiKeyHttpRoutePath.keyRename, httpMethod.POST, async (ctx, request) => {
    const op = "apiKeyRenameHttpHandler"
    const body = await bodyRead(request)
    if (body instanceof Response) return body
    const auth = await credentialTokenResolve(ctx, request, body.token)
    if (auth instanceof Response) return auth
    const parsed = va.safeParse(apiKeyRenameInputSchema, { ...body, token: auth.token })
    if (!parsed.success) {
      return new Response(jsonStringifyPretty(createResultError(op, va.summarize(parsed.issues))), {
        status: 400,
        headers: errorHeaders,
      })
    }
    const result = await ctx.runMutation(api.auth.apiKeyRenameMutation, { ...parsed.output, id: parsed.output.id as Id<"authApiKeys"> })
    return new Response(jsonStringifyPretty(result), {
      status: result.success ? 200 : 400,
      headers: result.success ? successHeaders : errorHeaders,
    })
  })

  addRouteWithCors(http, apiKeyHttpRoutePath.keyRevoke, httpMethod.POST, async (ctx, request) => {
    const op = "apiKeyRevokeHttpHandler"
    const body = await bodyRead(request)
    if (body instanceof Response) return body
    const auth = await credentialTokenResolve(ctx, request, body.token)
    if (auth instanceof Response) return auth
    const parsed = va.safeParse(apiKeyRevokeInputSchema, { ...body, token: auth.token })
    if (!parsed.success) {
      return new Response(jsonStringifyPretty(createResultError(op, va.summarize(parsed.issues))), {
        status: 400,
        headers: errorHeaders,
      })
    }
    const result = await ctx.runMutation(api.auth.apiKeyRevokeMutation, { ...parsed.output, id: parsed.output.id as Id<"authApiKeys"> })
    return new Response(jsonStringifyPretty(result), {
      status: result.success ? 200 : 400,
      headers: result.success ? successHeaders : errorHeaders,
    })
  })

  addRouteWithCors(http, apiKeyHttpRoutePath.keyRotate, httpMethod.POST, async (ctx, request) => {
    const op = "apiKeyRotateHttpHandler"
    const body = await bodyRead(request)
    if (body instanceof Response) return body
    const auth = await credentialTokenResolve(ctx, request, body.token)
    if (auth instanceof Response) return auth
    const parsed = va.safeParse(apiKeyRotateInputSchema, { ...body, token: auth.token })
    if (!parsed.success) {
      return new Response(jsonStringifyPretty(createResultError(op, va.summarize(parsed.issues))), {
        status: 400,
        headers: errorHeaders,
      })
    }
    const result = await ctx.runMutation(api.auth.apiKeyRotateMutation, { ...parsed.output, id: parsed.output.id as Id<"authApiKeys"> })
    return new Response(jsonStringifyPretty(result), {
      status: result.success ? 200 : 400,
      headers: result.success ? successHeaders : errorHeaders,
    })
  })

  return http
}
