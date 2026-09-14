import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { privateEnvVariableName } from "#src/app/env/privateEnvVariableName.ts"

export function envR2AccessKeyIdResult(): Result<string> {
  const op = "envR2AccessKeyIdResult"
  const name = privateEnvVariableName.R2_ACCESS_KEY_ID
  const value = process.env.R2_ACCESS_KEY_ID
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
