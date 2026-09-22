import type { ActionCtx } from "#convex/_generated/server.js"
import { internal } from "#convex/_generated/api.js"
import { createResult, type PromiseResult } from "#result"
import { envEnvModeResult } from "#src/app/env/public/envEnvModeResult.ts"
import type { Language } from "#src/app/i18n/language.ts"
import { sendTelegramMessageAuth } from "#src/auth/convex/telegram/sendTelegramMessageTechnical.ts"
import { envMode } from "#ui/env/envMode.ts"

export type GenerateEmailOrgInvitationProps = {
  invitedName: string
  invitedByName: string
  invitedByEmail: string
  orgName: string
  url: string
  l: Language
}

export async function sendEmailOrgInvitation(
  ctx: ActionCtx,
  invitedEmail: string,
  p: GenerateEmailOrgInvitationProps,
): PromiseResult<null> {
  const envResult = envEnvModeResult()
  if (!envResult.success) return envResult
  const env = envResult.data
  const isProd = env === envMode.production

  if (isProd) {
    const emailResult = await ctx.runAction(internal.authEmail.sendAuthEmailInternalAction, {
      kind: "orgInvitation",
      toEmail: invitedEmail,
      toName: p.invitedName,
      code: "",
      url: p.url,
      language: p.l,
      invitedByName: p.invitedByName,
      invitedByEmail: p.invitedByEmail,
      orgName: p.orgName,
    })
    if (!emailResult.success) return emailResult
  } else {
    console.info(env, "-> skipping sending email")
  }

  const name = env + " / org invitation"
  const telegramResult = await sendTelegramMessageAuth(name, {
    invitedEmail,
    ...p,
  })
  if (!telegramResult.success) return telegramResult

  return createResult(null)
}
