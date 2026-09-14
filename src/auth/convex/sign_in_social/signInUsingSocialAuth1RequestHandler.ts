import { internal } from "#convex/_generated/api.js"
import type { ActionCtx } from "#convex/_generated/server.js"
import { createResultError } from "#result"
import { enableGithub } from "#src/app/config/enableGithub.ts"
import { enableSignInDev } from "#src/app/config/enableSignInDev.ts"
import { envBaseUrlAppResult } from "#src/app/env/public/envBaseUrlAppResult.ts"
import { signInUsingSocialAuth2ActionFn } from "#src/auth/convex/sign_in_social/signInUsingSocialAuth2ActionFn.ts"
import type { UserSession } from "#src/auth/model/UserSession.ts"
import { type LoginProvider, loginProvider } from "#src/auth/model_field/socialLoginProvider.ts"
import { getDefaultUrlSignedIn } from "#src/auth/url/getDefaultUrlSignedIn.ts"
import { jsonStringifyPretty } from "#utils/json/jsonStringifyPretty.js"
import { base64urlEncodeObject } from "#utils/url/base64url.js"

export async function signInUsingSocialAuth1RequestHandler(
  provider: LoginProvider,
  ctx: ActionCtx,
  request: Request,
): Promise<Response> {
  const op = "signInUsingSocialAuth1RequestHandler"
  const url = new URL(request.url)
  const error = url.searchParams.get("error")
  if (error) {
    const errorMessage = "oauth returned error value: " + error
    const err = createResultError(op, errorMessage)
    console.warn(err)
    return new Response(jsonStringifyPretty(err), { status: 400 })
  }

  if (provider === loginProvider.github && !enableGithub()) {
    const errorMessage = "Github provider disabled"
    const err = createResultError(op, errorMessage)
    console.warn(err)
    return new Response(jsonStringifyPretty(err), { status: 400 })
  }

  if (provider === loginProvider.dev && !enableSignInDev()) {
    const errorMessage = "Dev provider disabled"
    const err = createResultError(op, errorMessage)
    console.warn(err)
    return new Response(jsonStringifyPretty(err), { status: 400 })
  }

  const code = url.searchParams.get("code")
  if (!code || code?.length <= 1) {
    const errorMessage = "missing code"
    const err = createResultError(op, errorMessage)
    console.warn(err)
    return new Response(jsonStringifyPretty(err), { status: 400 })
  }

  const tokenResult = await signInUsingSocialAuth2ActionFn(ctx, provider, code)
  if (!tokenResult.success) {
    console.warn(tokenResult)
    return new Response(jsonStringifyPretty(tokenResult), { status: 400 })
  }
  const userSession: UserSession = tokenResult.data

  const defaultStartPage = getDefaultUrlSignedIn()
  const state = url.searchParams.get("state") || defaultStartPage

  const userSessionSerializedResult = base64urlEncodeObject(userSession)
  if (!userSessionSerializedResult.success) {
    console.warn(userSessionSerializedResult)
    return new Response(jsonStringifyPretty(userSessionSerializedResult), {
      status: 400,
    })
  }
  const userSessionSerialized = userSessionSerializedResult.data

  const hostnameAppResult = envBaseUrlAppResult()
  if (!hostnameAppResult.success) {
    console.error(hostnameAppResult)
    return new Response(jsonStringifyPretty(hostnameAppResult), {
      status: 500,
    })
  }
  const hostnameApp = hostnameAppResult.data
  const redirectUrl = new URL(state, hostnameApp)
  redirectUrl.searchParams.set("userSession", userSessionSerialized)
  // redirectUrl.searchParams.set("redirectUrl", state)
  console.log("user signed in", { state, redirectUrl })

  await ctx.scheduler.runAfter(0, internal.auth.notifyTelegramAuthInternalAction, {
    userSession,
    operationName: "oauth",
  })

  return Response.redirect(redirectUrl.toString(), 302)
}
