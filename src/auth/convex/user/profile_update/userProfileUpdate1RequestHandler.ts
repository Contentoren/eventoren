import * as a from "valibot"
import { api } from "#convex/_generated/api.js"
import type { ActionCtx } from "#convex/_generated/server.js"
import { createError, createResult } from "#result"
import { commonApiErrorMessages } from "#src/auth/convex/sign_up/commonApiErrorMessages.ts"
import { userProfileUpdateSchema } from "#src/auth/convex/user/profile_update/userProfileUpdate.ts"
import type { UserSession } from "#src/auth/model/UserSession.ts"

export async function userProfileUpdate1RequestHandler(ctx: ActionCtx, request: Request): Promise<Response> {
  const op = "userProfileUpdate1RequestHandler"

  if (request.method !== "POST") {
    return new Response(commonApiErrorMessages.methodNotAllowed, {
      status: 405,
    })
  }

  const body = await request.text()
  if (!body) {
    const errorMessage = commonApiErrorMessages.emptyBody
    const errorResult = createError(op, errorMessage, body)
    console.warn(errorResult)
    return new Response(JSON.stringify(errorResult), { status: 400 })
  }
  const schema = a.pipe(a.string(), a.parseJson(), userProfileUpdateSchema)
  const validation = a.safeParse(schema, body)
  if (!validation.success) {
    const errorMessage = commonApiErrorMessages.schemaValidationFailed + ": " + a.summarize(validation.issues)
    const errorResult = createError(op, errorMessage, body)
    console.warn(errorResult)
    return new Response(JSON.stringify(errorResult), { status: 400 })
  }

  const result = await ctx.runMutation(api.auth.userProfileUpdateMutation, validation.output)
  if (!result.success) {
    const errorResult = result
    console.warn(errorResult)
    return new Response(JSON.stringify(errorResult), { status: 400 })
  }

  if (!result.data) {
    return new Response(JSON.stringify(createResult(null)), { status: 200 })
  }

  const userSession: UserSession = result.data
  return new Response(JSON.stringify(userSession), { status: 200 })
}
