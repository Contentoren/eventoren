import { v } from "convex/values"
import { type ActionCtx, internalAction } from "#convex/_generated/server.js"
import { createResult, type PromiseResult } from "#result"
import { envEnvModeResult } from "#src/app/env/public/envEnvModeResult.ts"
import { sendTelegramMessageAuth } from "#src/auth/convex/telegram/sendTelegramMessageTechnical.ts"
import { userSessionValidator } from "#src/auth/model/userSessionValidator.ts"
import { envMode } from "#ui/env/envMode.ts"

export const notifyTelegramAuthValidator = v.object({
  userSession: userSessionValidator,
  operationName: v.string(),
})

export type NotifyTelegramAuthValidatorType = typeof notifyTelegramAuthValidator.type

export const notifyTelegramAuthInternalAction = internalAction({
  args: notifyTelegramAuthValidator,
  handler: notifyTelegramAuthActionFn,
})

export async function notifyTelegramAuthActionFn(
  ctx: ActionCtx,
  args: NotifyTelegramAuthValidatorType,
): PromiseResult<null> {
  const envModeResult = envEnvModeResult()
  if (!envModeResult.success) return envModeResult
  if (envModeResult.data === envMode.development) return createResult(null)
  const name = envModeResult.data + " / " + args.operationName
  const { token, ...data } = args.userSession
  await sendTelegramMessageAuth(name, data)
  return createResult(null)
}
