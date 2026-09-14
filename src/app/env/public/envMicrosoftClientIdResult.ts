import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { publicEnvVariableName } from "#src/app/env/publicEnvVariableName.ts"

export function envMicrosoftClientIdResult(): Result<string> {
  const op = "envMicrosoftClientIdResult"
  const name = publicEnvVariableName.PUBLIC_MICROSOFT_CLIENT_ID
  const value = process.env.PUBLIC_MICROSOFT_CLIENT_ID
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
