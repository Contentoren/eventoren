import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { posthogProxyApiPath } from "#src/app/env/public/envPosthogHostResult.ts"
import { posthogProxyUiPath } from "#src/app/env/public/envPosthogUiHostResult.ts"
import { posthogConfigRead } from "./posthogConfigRead.ts"

describe("posthogConfigRead", () => {
  const keys = ["PUBLIC_ENV_MODE", "PUBLIC_POSTHOG_APP_ID", "PUBLIC_POSTHOG_HOST", "PUBLIC_POSTHOG_UI_HOST"] as const
  let saved: Record<(typeof keys)[number], string | undefined>

  beforeEach(() => {
    saved = {
      PUBLIC_ENV_MODE: process.env.PUBLIC_ENV_MODE,
      PUBLIC_POSTHOG_APP_ID: process.env.PUBLIC_POSTHOG_APP_ID,
      PUBLIC_POSTHOG_HOST: process.env.PUBLIC_POSTHOG_HOST,
      PUBLIC_POSTHOG_UI_HOST: process.env.PUBLIC_POSTHOG_UI_HOST,
    }
    process.env.PUBLIC_ENV_MODE = ""
    process.env.PUBLIC_POSTHOG_APP_ID = ""
    process.env.PUBLIC_POSTHOG_HOST = ""
    process.env.PUBLIC_POSTHOG_UI_HOST = ""
  })

  afterEach(() => {
    for (const key of keys) {
      const value = saved[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it("reports disabled outside production", () => {
    process.env.PUBLIC_ENV_MODE = "development"
    process.env.PUBLIC_POSTHOG_APP_ID = "phc_test"
    const result = posthogConfigRead()
    expect(result.success).toBe(false)
  })

  it("reports an error when the app id is missing in production", () => {
    process.env.PUBLIC_ENV_MODE = "production"
    const result = posthogConfigRead()
    expect(result.success).toBe(false)
  })

  it("resolves the app id with first-party proxy hosts in production", () => {
    process.env.PUBLIC_ENV_MODE = "production"
    process.env.PUBLIC_POSTHOG_APP_ID = "phc_test"
    const result = posthogConfigRead()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.appId).toBe("phc_test")
      expect(result.data.apiHost).toBe(posthogProxyApiPath)
      expect(result.data.uiHost).toBe(posthogProxyUiPath)
    }
  })

  it("prefers explicit host overrides", () => {
    process.env.PUBLIC_ENV_MODE = "production"
    process.env.PUBLIC_POSTHOG_APP_ID = "phc_test"
    process.env.PUBLIC_POSTHOG_HOST = "https://eu.example.com"
    process.env.PUBLIC_POSTHOG_UI_HOST = "https://eu-assets.example.com"
    const result = posthogConfigRead()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.apiHost).toBe("https://eu.example.com")
      expect(result.data.uiHost).toBe("https://eu-assets.example.com")
    }
  })
})
