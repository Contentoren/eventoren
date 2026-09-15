import { createResult, createResultError, type PromiseResult } from "#result"
import { authZitadelManagementConfigRead } from "./authZitadelManagementConfigRead.ts"

type ZitadelManagementRequest = {
  method: "DELETE" | "GET" | "POST" | "PUT"
  path: string
  body?: unknown
  fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
}

export async function authZitadelManagementRequest(options: ZitadelManagementRequest): PromiseResult<unknown> {
  const op = "authZitadelManagementRequest"
  const configResult = authZitadelManagementConfigRead()
  if (!configResult.success) return configResult
  const config = configResult.data
  const fetchImplementation = options.fetch ?? globalThis.fetch

  let response: Response
  try {
    response = await fetchImplementation(`${config.baseUrl}${options.path}`, {
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "x-zitadel-orgid": config.organizationId,
      },
      method: options.method,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return createResultError(op, `ZITADEL request failed: ${message.replaceAll(config.token, "[redacted]")}`)
  }

  if (!response.ok) {
    const statusText = response.statusText ? ` ${response.statusText}` : ""
    return createResultError(op, `ZITADEL request failed: HTTP ${response.status}${statusText}`)
  }

  let body: string
  try {
    body = await response.text()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return createResultError(
      op,
      `ZITADEL response could not be read: ${message.replaceAll(config.token, "[redacted]")}`,
    )
  }
  if (!body.trim()) return createResult(undefined)

  try {
    return createResult(JSON.parse(body) as unknown)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return createResultError(
      op,
      `ZITADEL response was not valid JSON: ${message.replaceAll(config.token, "[redacted]")}`,
    )
  }
}
