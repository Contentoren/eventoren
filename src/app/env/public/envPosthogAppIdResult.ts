import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { publicEnvVariableName } from "#src/app/env/publicEnvVariableName.ts"

export function envPosthogAppIdResult(): Result<string> {
  const op = "envPosthogAppIdResult"
  const name = publicEnvVariableName.PUBLIC_POSTHOG_APP_ID
  const value = process.env.PUBLIC_POSTHOG_APP_ID
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
