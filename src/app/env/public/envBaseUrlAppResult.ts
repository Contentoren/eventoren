import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { publicEnvVariableName } from "#src/app/env/publicEnvVariableName.ts"

export function envBaseUrlAppResult(): Result<string> {
  const op = "envBaseUrlAppResult"
  const name = publicEnvVariableName.PUBLIC_BASE_URL_APP
  const value = process.env.PUBLIC_BASE_URL_APP
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
