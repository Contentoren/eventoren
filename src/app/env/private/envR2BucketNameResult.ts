import { createResult, createResultError, type Result } from "#result"
import { envVariableErrorMessage } from "#src/app/env/envVariableErrorMessage.ts"
import { privateEnvVariableName } from "#src/app/env/privateEnvVariableName.ts"

export function envR2BucketNameResult(): Result<string> {
  const op = "envR2BucketNameResult"
  const name = privateEnvVariableName.R2_BUCKET_NAME
  const value = process.env.R2_BUCKET_NAME
  if (!value) {
    const errorMessage = envVariableErrorMessage(name)
    return createResultError(op, errorMessage)
  }
  return createResult(value)
}
