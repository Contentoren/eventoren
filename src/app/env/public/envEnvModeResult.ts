import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { publicEnvVariableName } from "#src/app/env/publicEnvVariableName.ts"

export function envEnvModeResult(): Result<string> {
  const op = "envEnvModeResult"
  const name = publicEnvVariableName.PUBLIC_ENV_MODE
  const processEnv = typeof process !== "undefined" ? process.env : undefined
  const metaEnv = typeof import.meta !== "undefined" ? import.meta.env : undefined
  const mode = processEnv?.PUBLIC_ENV_MODE || metaEnv?.PUBLIC_ENV_MODE
  if (!mode) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(mode)
}
