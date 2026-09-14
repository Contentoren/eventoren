import { envEnvModeResult } from "#src/app/env/public/envEnvModeResult.ts"

export function isProdEnv() {
  const op = "isProdEnvVite"
  const modeResult = envEnvModeResult()
  if (!modeResult.success) {
    console.error(op, modeResult)
    return false
  }
  return modeResult.data === "production"
}
