import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { publicEnvVariableName } from "#src/app/env/publicEnvVariableName.ts"

export function envPosthogAppIdResult(): Result<string> {
  const op = "envPosthogAppIdResult"
  const name = publicEnvVariableName.PUBLIC_POSTHOG_APP_ID
  const processEnv = typeof process !== "undefined" ? process.env : undefined
  const metaEnv = typeof import.meta !== "undefined" ? import.meta.env : undefined
  const value = processEnv?.PUBLIC_POSTHOG_APP_ID || metaEnv?.PUBLIC_POSTHOG_APP_ID
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
