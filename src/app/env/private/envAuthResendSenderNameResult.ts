import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { privateEnvVariableName } from "#src/app/env/privateEnvVariableName.ts"

export function envAuthResendSenderNameResult(): Result<string> {
  const op = "envAuthResendSenderNameResult"
  const name = privateEnvVariableName.AUTH_RESEND_SENDER_NAME
  const value = process.env.AUTH_RESEND_SENDER_NAME
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
