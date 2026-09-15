import { createResult, createResultError, type Result } from "#result"

type ZitadelManagementConfig = {
  baseUrl: string
  organizationId: string
  projectId: string
  token: string
}

export function authZitadelManagementConfigRead(): Result<ZitadelManagementConfig> {
  const op = "authZitadelManagementConfigRead"
  const baseUrl = (process.env.ZITADEL_MANAGEMENT_BASE_URL?.trim() || process.env.ZITADEL_ISSUER?.trim() || "").replace(
    /\/$/u,
    "",
  )
  const organizationId = process.env.ZITADEL_ORGANIZATION_ID?.trim() || ""
  const projectId = process.env.ZITADEL_PROJECT_ID?.trim() || ""
  const token = process.env.ZITADEL_MANAGEMENT_TOKEN?.trim() || ""

  if (!baseUrl) return createResultError(op, "ZITADEL Management API base URL is not configured")
  try {
    new URL(baseUrl)
  } catch {
    return createResultError(op, "ZITADEL Management API base URL is not configured")
  }
  if (!organizationId) return createResultError(op, "ZITADEL organization ID is not configured")
  if (!projectId) return createResultError(op, "ZITADEL project ID is not configured")
  if (!token) return createResultError(op, "ZITADEL Management API token is not configured")

  return createResult({
    baseUrl,
    organizationId,
    projectId,
    token,
  })
}
