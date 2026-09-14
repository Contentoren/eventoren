import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { publicEnvVariableName } from "#src/app/env/publicEnvVariableName.ts"

export function envBaseUrlR2Result(): Result<string> {
  const op = "envBaseUrlR2Result"
  const name = publicEnvVariableName.PUBLIC_BASE_URL_R2
  const value = process.env.PUBLIC_BASE_URL_R2
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
