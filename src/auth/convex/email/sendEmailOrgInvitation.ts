import {
  apiGenerateEmailOrgInvitationV1,
  type GeneratedEmailType,
  type OrgInvitationV1Type,
} from "@adaptive-ds/email-generator/index.js"
import { createError, createResult, type PromiseResult } from "#result"
import { envBaseUrlEmailGeneratorResult } from "#src/app/env/private/envBaseUrlEmailGeneratorResult.ts"
import { envEnvModeResult } from "#src/app/env/public/envEnvModeResult.ts"
import type { Language } from "#src/app/i18n/language.ts"
import { createAuthResendEnvVariableNames } from "#src/auth/convex/email/createAuthResendEnvVariableNames.ts"
import { generateSharedEmailProps } from "#src/auth/convex/email/generateSharedEmailProps.ts"
import { sendTelegramMessageAuth } from "#src/auth/convex/telegram/sendTelegramMessageTechnical.ts"
import { envMode } from "#ui/env/envMode.ts"
import type { ResendAddressInfo } from "#utils/email/resend/sendEmailsViaResendApi.js"
import { sendSingleEmailViaResend } from "#utils/email/resend/sendEmailViaResend.js"

export type GenerateEmailOrgInvitationProps = {
  invitedName: string
  invitedByName: string
  invitedByEmail: string
  orgName: string
  url: string
  l: Language
}

export async function sendEmailOrgInvitation(
  invitedEmail: string,
  p: GenerateEmailOrgInvitationProps,
): PromiseResult<null> {
  const generatedResult = await generateEmailOrgInvitation(p)
  if (!generatedResult.success) return generatedResult
  const { subject, html, text } = generatedResult.data

  const to: ResendAddressInfo = { name: p.invitedName, email: invitedEmail }

  const envResult = envEnvModeResult()
  if (!envResult.success) return envResult
  const env = envResult.data
  const isProd = env === envMode.production

  if (isProd) {
    const emailResult = await sendSingleEmailViaResend(subject, html, text, to, createAuthResendEnvVariableNames())
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

export async function generateEmailOrgInvitation(
  p: GenerateEmailOrgInvitationProps,
): PromiseResult<GeneratedEmailType> {
  const op = "generateEmailOrgInvitation"
  const props: OrgInvitationV1Type = {
    ...generateSharedEmailProps(p.l),
    ...p,
  }
  const baseUrlResult = envBaseUrlEmailGeneratorResult()
  if (!baseUrlResult.success) return baseUrlResult
  const generatedResult = await apiGenerateEmailOrgInvitationV1(props, baseUrlResult.data)
  if (!generatedResult.success) {
    return createError(op, "Failed to generate email: " + generatedResult.errorMessage)
  }
  return generatedResult
}
