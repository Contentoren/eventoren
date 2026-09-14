import * as a from "valibot"
import { internal } from "#convex/_generated/api.js"
import type { ActionCtx } from "#convex/_generated/server.js"
import { createError } from "#result"
import { envBaseUrlAppResult } from "#src/app/env/public/envBaseUrlAppResult.ts"
import { sendEmailSignIn } from "#src/auth/convex/email/sendEmailSignIn.ts"
import { commonApiErrorMessages } from "#src/auth/convex/sign_up/commonApiErrorMessages.ts"
import { signInViaEmailSchema } from "#src/auth/model/signInSchema.ts"
import { pageRouteAuth } from "#src/auth/url/pageRouteAuth.ts"
import { jsonStringifyPretty } from "#utils/json/jsonStringifyPretty.js"

export async function signInViaEmail1RequestHandler(ctx: ActionCtx, request: Request): Promise<Response> {
  const op = "signInEmail1HttpHandler"

  if (request.method !== "POST") {
    return new Response(commonApiErrorMessages.methodNotAllowed, {
      status: 405,
    })
  }

  const textBody = await request.text()
  if (!textBody) {
    const errorMessage = commonApiErrorMessages.emptyBody
    const errorResult = createError(op, errorMessage, textBody)
    console.error(errorResult)
    return new Response(JSON.stringify(errorResult), { status: 400 })
  }
  const schema = a.pipe(a.string(), a.parseJson(), signInViaEmailSchema)
  const validation = a.safeParse(schema, textBody)
  if (!validation.success) {
    const errorMessage = commonApiErrorMessages.schemaValidationFailed + ": " + a.summarize(validation.issues)
    const errorResult = createError(op, errorMessage, textBody)
    console.error(errorResult)
    return new Response(JSON.stringify(errorResult), { status: 400 })
  }

  const { email, l } = validation.output

  // Run mutation to save code
  const codeResult = await ctx.runMutation(internal.auth.signInViaEmail2InternalMutation, { email })
  if (!codeResult.success) {
    const errorResult = codeResult
    console.warn(errorResult)
    return new Response(JSON.stringify(errorResult), { status: 400 })
  }

  const code = codeResult.data

  const baseUrlAppResult = envBaseUrlAppResult()
  if (!baseUrlAppResult.success) {
    console.error(op, baseUrlAppResult)
    return new Response(jsonStringifyPretty(baseUrlAppResult), { status: 500 })
  }
  const baseUrlApp = baseUrlAppResult.data

  // Send email
  const confirmUrl = new URL(pageRouteAuth.signInEnterOtp, baseUrlApp)
  confirmUrl.searchParams.set("email", email)
  confirmUrl.searchParams.set("code", code)
  await sendEmailSignIn(email, code, confirmUrl.toString(), l)

  return new Response("Sign in code sent", { status: 200 })
}
