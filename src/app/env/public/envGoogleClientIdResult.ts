import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { publicEnvVariableName } from "#src/app/env/publicEnvVariableName.ts"

export function envGoogleClientIdResult(): Result<string> {
  const op = "envGoogleClientIdResult"
  const name = publicEnvVariableName.PUBLIC_GOOGLE_CLIENT_ID
  const value = process.env.PUBLIC_GOOGLE_CLIENT_ID
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
