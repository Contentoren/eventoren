import { createResult, type Result } from "#result"
import { publicEnvVariableName } from "#src/app/env/publicEnvVariableName.ts"
import { isProdEnv } from "#src/utils/env/isProdEnv.ts"

export const posthogDefaultHost = "https://eu.i.posthog.com"
export const posthogProxyApiPath = "/ph-api"

export function envPosthogHostResult(): Result<string> {
  const processEnv = typeof process !== "undefined" ? process.env : undefined
  const metaEnv = typeof import.meta !== "undefined" ? import.meta.env : undefined
  const override =
    processEnv?.[publicEnvVariableName.PUBLIC_POSTHOG_HOST]?.trim() || metaEnv?.PUBLIC_POSTHOG_HOST?.trim()
  if (override) return createResult(override)
  if (isProdEnv()) return createResult(posthogProxyApiPath)
  return createResult(posthogDefaultHost)
}
