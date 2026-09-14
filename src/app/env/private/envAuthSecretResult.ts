import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { privateEnvVariableName } from "#src/app/env/privateEnvVariableName.ts"

export function envAuthSecretResult(): Result<string> {
  const op = "envAuthSecretResult"
  const name = privateEnvVariableName.AUTH_SECRET
  const value = process.env.AUTH_SECRET
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
