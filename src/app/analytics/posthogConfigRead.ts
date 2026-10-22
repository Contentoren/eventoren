import { createResult, createResultError, type Result } from "#result"
import { enablePosthog } from "#src/app/config/enablePosthog.ts"
import { envPosthogAppIdResult } from "#src/app/env/public/envPosthogAppIdResult.ts"
import { envPosthogHostResult } from "#src/app/env/public/envPosthogHostResult.ts"
import { envPosthogUiHostResult } from "#src/app/env/public/envPosthogUiHostResult.ts"

export type PosthogConfig = {
  readonly appId: string
  readonly apiHost: string
  readonly uiHost: string
}

export function posthogConfigRead(): Result<PosthogConfig> {
  const op = "posthogConfigRead"
  if (!enablePosthog()) return createResultError(op, "PostHog is disabled")
  const appId = envPosthogAppIdResult()
  if (!appId.success) return appId
  const apiHost = envPosthogHostResult()
  if (!apiHost.success) return apiHost
  const uiHost = envPosthogUiHostResult()
  if (!uiHost.success) return uiHost
  return createResult({ appId: appId.data, apiHost: apiHost.data, uiHost: uiHost.data })
}
