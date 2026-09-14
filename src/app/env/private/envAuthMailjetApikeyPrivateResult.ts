import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { privateEnvVariableName } from "#src/app/env/privateEnvVariableName.ts"

export function envAuthMailjetApikeyPrivateResult(): Result<string> {
  const op = "getAuthMailjetApikeyPrivateResult"
  const name = privateEnvVariableName.AUTH_MAILJET_APIKEY_PRIVATE
  const value = process.env.AUTH_MAILJET_APIKEY_PRIVATE
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
