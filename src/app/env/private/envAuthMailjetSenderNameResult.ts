import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { privateEnvVariableName } from "#src/app/env/privateEnvVariableName.ts"

export function envAuthMailjetSenderNameResult(): Result<string> {
  const op = "envAuthMailjetSenderNameResult"
  const name = privateEnvVariableName.AUTH_MAILJET_SENDER_NAME
  const value = process.env.AUTH_MAILJET_SENDER_NAME
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
