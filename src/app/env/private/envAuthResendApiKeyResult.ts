import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { privateEnvVariableName } from "#src/app/env/privateEnvVariableName.ts"

export function envAuthResendApiKeyResult(): Result<string> {
  const op = "envAuthResendApiKeyResult"
  const name = privateEnvVariableName.AUTH_RESEND_API_KEY
  const value = process.env.AUTH_RESEND_API_KEY
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
