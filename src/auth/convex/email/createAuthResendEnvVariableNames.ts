import { privateEnvVariableName } from "#src/app/env/privateEnvVariableName.ts"
import type { ResendEnvVariableNames } from "#utils/email/resend/sendEmailsViaResend.js"

export function createAuthResendEnvVariableNames(): ResendEnvVariableNames {
  return {
    apiKey: privateEnvVariableName.AUTH_RESEND_API_KEY,
    senderAddress: privateEnvVariableName.AUTH_RESEND_SENDER_ADDRESS,
    senderName: privateEnvVariableName.AUTH_RESEND_SENDER_NAME,
  }
}
