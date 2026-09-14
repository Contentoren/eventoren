import { api } from "#convex/_generated/api.js"
import type { ActionCtx } from "#convex/_generated/server.js"
import { createError } from "#result"
import { commonApiErrorMessages } from "#src/auth/convex/sign_up/commonApiErrorMessages.ts"

export async function userDelete1RequestHandler(ctx: ActionCtx, request: Request): Promise<Response> {
  const op = "userDelete1RequestHandler"

  if (request.method !== "POST") {
    return new Response(commonApiErrorMessages.methodNotAllowed, {
      status: 405,
    })
  }

  try {
    const body = await request.text()
    if (!body) {
      const errorMessage = commonApiErrorMessages.emptyBody
      const errorResult = createError(op, errorMessage, body)
      console.warn(errorResult)
      return new Response(JSON.stringify(errorResult), { status: 400 })
    }

    let args: { token: string }
    try {
      const parsed = JSON.parse(body)
      args = { token: parsed.token }
    } catch {
      return Response.json({ success: false, op, errorMessage: "Invalid JSON body" }, { status: 400 })
    }

    const result = await ctx.runMutation(api.auth.userDeleteSoftMutation, args)

    if (!result.success) {
      return Response.json(
        {
          success: false,
          op: result.op,
          errorMessage: result.errorMessage,
          errorData: result.errorData,
        },
        { status: 400 },
      )
    }

    return Response.json({ success: true, data: null })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error(op, errorMessage)
    return Response.json({ success: false, op, errorMessage }, { status: 500 })
  }
}
