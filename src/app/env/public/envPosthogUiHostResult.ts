import { createResult, type Result } from "#result"
import { publicEnvVariableName } from "#src/app/env/publicEnvVariableName.ts"
import { isProdEnv } from "#src/utils/env/isProdEnv.ts"

export const posthogDefaultUiHost = "https://eu-assets.i.posthog.com"
export const posthogProxyUiPath = "/ph-ui"

export function envPosthogUiHostResult(): Result<string> {
  const processEnv = typeof process !== "undefined" ? process.env : undefined
  const metaEnv = typeof import.meta !== "undefined" ? import.meta.env : undefined
  const override =
    processEnv?.[publicEnvVariableName.PUBLIC_POSTHOG_UI_HOST]?.trim() || metaEnv?.PUBLIC_POSTHOG_UI_HOST?.trim()
  if (override) return createResult(override)
  if (isProdEnv()) return createResult(posthogProxyUiPath)
  return createResult(posthogDefaultUiHost)
}
