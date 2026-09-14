import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { privateEnvVariableName } from "#src/app/env/privateEnvVariableName.ts"

export function envAuthMailjetSenderAddressResult(): Result<string> {
  const op = "envAuthMailjetSenderAddressResult"
  const name = privateEnvVariableName.AUTH_MAILJET_SENDER_ADDRESS
  const value = process.env.AUTH_MAILJET_SENDER_ADDRESS
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
