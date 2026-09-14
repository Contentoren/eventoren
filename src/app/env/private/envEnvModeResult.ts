import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { publicEnvVariableName } from "#src/app/env/publicEnvVariableName.ts"

export function envEnvModeResult(): Result<string> {
  const op = "envEnvModeResult"
  const name = publicEnvVariableName.PUBLIC_ENV_MODE
  const value = process.env.PUBLIC_ENV_MODE
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
