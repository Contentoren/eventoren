import type { ActionCtx } from "#convex/_generated/server.js"
import { internal } from "#convex/_generated/api.js"
import { createResult, type PromiseResult } from "#result"
import { envEnvModeResult } from "#src/app/env/public/envEnvModeResult.ts"
import type { Language } from "#src/app/i18n/language.ts"
import { sendTelegramMessageAuth } from "#src/auth/convex/telegram/sendTelegramMessageTechnical.ts"
import { envMode } from "#ui/env/envMode.ts"

export async function sendEmailSignUp(
  ctx: ActionCtx,
  name: string,
  email: string,
  code: string,
  url: string,
  l: Language,
): PromiseResult<null> {
  const data = { code, url, email }

  const envResult = envEnvModeResult()
  if (!envResult.success) return envResult
  const env = envResult.data
  const isProd = env === envMode.production

  if (isProd) {
    const emailResult = await ctx.runAction(internal.authEmail.sendAuthEmailInternalAction, {
      kind: "signUp",
      toEmail: email,
      toName: name,
      code,
      url,
      language: l,
    })
    if (!emailResult.success) return emailResult
  } else {
    console.info(env, "-> skipping sending email")
  }

  const telegramResult = await sendTelegramMessageAuth(env + " / user sign-up / " + name, data)
  if (!telegramResult.success) return telegramResult

  return createResult(null)
}
