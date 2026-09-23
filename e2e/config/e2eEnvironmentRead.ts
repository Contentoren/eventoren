import { createResult, createResultError } from "#result"

const defaultBaseUrl = "https://eventoren.leonardomora.de"

export const e2eEnvironmentRead = (environment: Record<string, string | undefined>) => {
  const op = "e2eEnvironmentRead"
  const rawBaseUrl = environment.E2E_BASE_URL?.trim() || defaultBaseUrl
  let baseUrl: URL

  try {
    baseUrl = new URL(rawBaseUrl)
  } catch {
    return createResultError(op, "E2E_BASE_URL must be an absolute HTTP(S) URL")
  }

  if (baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") {
    return createResultError(op, "E2E_BASE_URL must use HTTP or HTTPS")
  }

  const mailcow = Object.fromEntries(
    Object.entries(environment).filter(
      ([name, value]) => name.startsWith("TEST_CUSTOMER_MAILCOW_") && value !== undefined,
    ),
  )

  return createResult({
    baseUrl: baseUrl.toString().replace(/\/$/, ""),
    authUsername: environment.E2E_AUTH_USERNAME?.trim() || undefined,
    authPassword: environment.E2E_AUTH_PASSWORD || undefined,
    mailcow,
  })
}
