import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { privateEnvVariableName } from "#src/app/env/privateEnvVariableName.ts"

export function envAuthMailjetApikeyPublicResult(): Result<string> {
  const op = "envAuthMailjetApikeyPublicResult"
  const name = privateEnvVariableName.AUTH_MAILJET_APIKEY_PUBLIC
  const value = process.env.AUTH_MAILJET_APIKEY_PUBLIC
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
