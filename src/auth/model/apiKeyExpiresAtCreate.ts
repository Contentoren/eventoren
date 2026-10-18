import type { ApiKeyExpiryPreset } from "./apiKeyExpiryPreset.ts"

const expiryDurationMs: Record<Exclude<ApiKeyExpiryPreset, "never">, number> = {
  "1-day": 24 * 60 * 60 * 1000,
  "1-week": 7 * 24 * 60 * 60 * 1000,
  "1-month": 30 * 24 * 60 * 60 * 1000,
  "1-year": 365 * 24 * 60 * 60 * 1000,
  "2-years": 2 * 365 * 24 * 60 * 60 * 1000,
  "3-years": 3 * 365 * 24 * 60 * 60 * 1000,
}

export function apiKeyExpiresAtCreate(preset?: ApiKeyExpiryPreset, nowMs = Date.now()): string | undefined {
  const selectedPreset = preset ?? "1-month"
  if (selectedPreset === "never") return undefined

  return new Date(nowMs + expiryDurationMs[selectedPreset]).toISOString()
}
