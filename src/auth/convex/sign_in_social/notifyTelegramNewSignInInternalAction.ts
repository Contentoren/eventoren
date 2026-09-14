import { v } from "convex/values"
import { type ActionCtx, internalAction } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { envEnvModeResult } from "#src/app/env/public/envEnvModeResult.ts"
import { sendTelegramMessageAuth } from "#src/auth/convex/telegram/sendTelegramMessageTechnical.ts"
import { userSessionValidator } from "#src/auth/model/userSessionValidator.ts"
import { envMode } from "#ui/env/envMode.ts"

export const notifyTelegramNewSignUpArgsValidator = v.object({
  userSession: userSessionValidator,
})

export type NotifyTelegramNewSignUpArgsType = typeof notifyTelegramNewSignUpArgsValidator.type

export const notifyTelegramNewSignInInternalAction = internalAction({
  args: notifyTelegramNewSignUpArgsValidator,
  handler: notifyTelegramNewSignInInternalActionFn,
})

export async function notifyTelegramNewSignInInternalActionFn(
  ctx: ActionCtx,
  args: NotifyTelegramNewSignUpArgsType,
): PromiseResult<null> {
  const envModeResult = envEnvModeResult()
  if (!envModeResult.success) return envModeResult
  if (envModeResult.data === envMode.development) return createResult(null)
  const name = envModeResult.data + " / user signed in"
  const { token, ...data } = args.userSession
  await sendTelegramMessageAuth(name, data)
  return createResult(null)
}
