import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { privateEnvVariableName } from "#src/app/env/privateEnvVariableName.ts"

export function envMicrosoftClientSecretResult(): Result<string> {
  const op = "envMicrosoftClientSecretResult"
  const name = privateEnvVariableName.MICROSOFT_CLIENT_SECRET
  const value = process.env.MICROSOFT_CLIENT_SECRET
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
