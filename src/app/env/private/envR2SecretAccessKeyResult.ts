import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { privateEnvVariableName } from "#src/app/env/privateEnvVariableName.ts"

export function envR2SecretAccessKeyResult(): Result<string> {
  const op = "envR2SecretAccessKeyResult"
  const name = privateEnvVariableName.R2_SECRET_ACCESS_KEY
  const value = process.env.R2_SECRET_ACCESS_KEY
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
