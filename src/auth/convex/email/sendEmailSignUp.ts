import {
  apiGenerateEmailSignUpV1,
  type GeneratedEmailType,
  type SignUpV1Type,
} from "@adaptive-ds/email-generator/index.js"
import { createResult, type PromiseResult } from "#result"
import { envBaseUrlEmailGeneratorResult } from "#src/app/env/private/envBaseUrlEmailGeneratorResult.ts"
import { envEnvModeResult } from "#src/app/env/public/envEnvModeResult.ts"
import type { Language } from "#src/app/i18n/language.ts"
import { createAuthResendEnvVariableNames } from "#src/auth/convex/email/createAuthResendEnvVariableNames.ts"
import { generateSharedEmailProps } from "#src/auth/convex/email/generateSharedEmailProps.ts"
import { sendTelegramMessageAuth } from "#src/auth/convex/telegram/sendTelegramMessageTechnical.ts"
import { envMode } from "#ui/env/envMode.ts"
import type { ResendAddressInfo } from "#utils/email/resend/sendEmailsViaResendApi.js"
import { sendSingleEmailViaResend } from "#utils/email/resend/sendEmailViaResend.js"

export async function sendEmailSignUp(
  name: string,
  email: string,
  code: string,
  url: string,
  l: Language,
): PromiseResult<null> {
  const data = { code, url, email }

  const generatedResult = await generateEmailSignUp(code, url, l)
  if (!generatedResult.success) return generatedResult
  const { subject, html, text } = generatedResult.data

  const to: ResendAddressInfo = { name, email }

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

  const telegramResult = await sendTelegramMessageAuth(env + " / user sign-up / " + name, data)
  if (!telegramResult.success) return telegramResult

  return createResult(null)
}

export async function generateEmailSignUp(code: string, url: string, l: Language): PromiseResult<GeneratedEmailType> {
  const op = "generateEmailSignUp"
  const props: SignUpV1Type = {
    // l: "en",
    ...generateSharedEmailProps(l),
    code,
    url,
  }
  return await apiGenerateRegisterEmail(props)
}

export async function apiGenerateRegisterEmail(props: SignUpV1Type): PromiseResult<GeneratedEmailType> {
  const baseUrlResult = envBaseUrlEmailGeneratorResult()
  if (!baseUrlResult.success) return baseUrlResult
  return apiGenerateEmailSignUpV1(props, baseUrlResult.data)
}
