import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { privateEnvVariableName } from "#src/app/env/privateEnvVariableName.ts"

export function envGoogleClientSecretResult(): Result<string> {
  const op = "envGoogleClientSecretResult"
  const name = privateEnvVariableName.GOOGLE_CLIENT_SECRET
  const value = process.env.GOOGLE_CLIENT_SECRET
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
