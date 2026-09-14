import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { publicEnvVariableName } from "#src/app/env/publicEnvVariableName.ts"

export function envBaseUrlSiteResult(): Result<string> {
  const op = "envBaseUrlSiteResult"
  const name = publicEnvVariableName.PUBLIC_BASE_URL_SITE
  const value = process.env.PUBLIC_BASE_URL_SITE
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
