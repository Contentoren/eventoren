import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { publicEnvVariableName } from "#src/app/env/publicEnvVariableName.ts"

export function envBaseUrlApiResult(): Result<string> {
  const op = "envBaseUrlApiResult"
  const name = publicEnvVariableName.PUBLIC_BASE_URL_API
  const processEnv = typeof process === "undefined" ? undefined : process.env
  const value = processEnv?.PUBLIC_BASE_URL_API ?? import.meta.env.PUBLIC_BASE_URL_API
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
