import { createResult, createResultError } from "#result"

const targetOrigins = {
  production: "https://eventoren.de",
  development: "https://eventoren.leonardomora.de",
} as const

export const e2eEnvironmentRead = (environment: Record<string, string | undefined>) => {
  const op = "e2eEnvironmentRead"
  const rawTarget = environment.E2E_TARGET?.trim() || "production"
  if (rawTarget !== "production" && rawTarget !== "development") {
    return createResultError(op, "E2E_TARGET must be production or development")
  }
  const target: "production" | "development" = rawTarget
  const rawBaseUrl = environment.E2E_BASE_URL?.trim() || targetOrigins[target]
  let baseUrl: URL

  try {
    baseUrl = new URL(rawBaseUrl)
  } catch {
    return createResultError(op, "E2E_BASE_URL must be an absolute HTTP(S) URL")
  }

  if (
    baseUrl.origin !== targetOrigins[target] ||
    baseUrl.pathname !== "/" ||
    baseUrl.search ||
    baseUrl.hash ||
    baseUrl.username ||
    baseUrl.password
  ) {
    return createResultError(
      op,
      `E2E_BASE_URL must be the canonical ${target} Eventoren origin (${targetOrigins[target]})`,
    )
  }

  const mailcow = Object.fromEntries(
    Object.entries(environment).filter(
      ([name, value]) => name.startsWith("TEST_CUSTOMER_MAILCOW_") && value !== undefined,
    ),
  )

  return createResult({
    target,
    baseUrl: baseUrl.origin,
    authUsername: environment.E2E_AUTH_USERNAME?.trim() || undefined,
    authPassword: environment.E2E_AUTH_PASSWORD || undefined,
    mailcow,
  })
}
