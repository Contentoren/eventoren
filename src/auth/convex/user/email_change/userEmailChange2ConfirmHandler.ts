import * as a from "valibot"
import { api } from "#convex/_generated/api.js"
import type { ActionCtx } from "#convex/_generated/server.js"
import { createError } from "#result"
import { commonApiErrorMessages } from "#src/auth/convex/sign_up/commonApiErrorMessages.ts"

const userEmailChangeConfirmSchema = a.object({
  token: a.string(),
  newEmail: a.string(),
  confirmationCode: a.string(),
})

export async function userEmailChange2ConfirmHandler(ctx: ActionCtx, request: Request): Promise<Response> {
  const op = "userEmailChangeConfirm1RequestHandler"

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
  const schema = a.pipe(a.string(), a.parseJson(), userEmailChangeConfirmSchema)
  const validation = a.safeParse(schema, body)
  if (!validation.success) {
    const errorMessage = commonApiErrorMessages.schemaValidationFailed + ": " + a.summarize(validation.issues)
    const errorResult = createError(op, errorMessage, body)
    console.warn(errorResult)
    return new Response(JSON.stringify(errorResult), { status: 400 })
  }

  const result = await ctx.runMutation(api.auth.userEmailChange2ConfirmMutation, validation.output)
  if (!result.success) {
    const errorResult = result
    console.warn(errorResult)
    return new Response(JSON.stringify(errorResult), { status: 400 })
  }

  return new Response(JSON.stringify(result), { status: 200 })
}
