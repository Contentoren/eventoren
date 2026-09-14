import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { privateEnvVariableName } from "#src/app/env/privateEnvVariableName.ts"

export function envBaseUrlEmailGeneratorResult(): Result<string> {
  const op = "envBaseUrlEmailGeneratorResult"
  const name = privateEnvVariableName.BASE_URL_EMAIL_GENERATOR
  const value = process.env.BASE_URL_EMAIL_GENERATOR
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
