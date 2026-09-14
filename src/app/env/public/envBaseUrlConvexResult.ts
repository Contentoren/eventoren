import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { publicEnvVariableName } from "#src/app/env/publicEnvVariableName.ts"

export function envBaseUrlConvexResult(): Result<string> {
  const op = "envBaseUrlConvexResult"
  const name = publicEnvVariableName.PUBLIC_BASE_URL_CONVEX
  const value = process.env.PUBLIC_BASE_URL_CONVEX
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
