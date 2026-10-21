import { ConvexHttpClient } from "convex/browser"
import { organizerDashboardBackendDispatchRequest } from "../organizer/dashboard/api/organizerDashboardBackendDispatchRequest.ts"
import type { OrganizerDashboardHttpBackend } from "../organizer/dashboard/api/organizerDashboardConvexBackendCreate.ts"
import { organizerDashboardConvexBackendCreate } from "../organizer/dashboard/api/organizerDashboardConvexBackendCreate.ts"
import { organizerDashboardErrorCatalog } from "../organizer/dashboard/api/organizerDashboardErrorCatalog.ts"
import { organizerDashboardErrorEnvelopeCreate } from "../organizer/dashboard/api/organizerDashboardErrorEnvelopeCreate.ts"
import {
  type OrganizerDashboardOperation,
  organizerDashboardOperations,
  organizerDashboardOperationSet,
} from "../organizer/dashboard/api/organizerDashboardOperations.ts"
import { organizerDashboardRequestMaxBytes } from "../organizer/dashboard/api/organizerDashboardRequestMaxBytes.ts"
import { organizerDashboardRequestParse } from "../organizer/dashboard/api/organizerDashboardRequestParse.ts"

const transportMessage = "Backend transport failed"

const usageText = `Usage: eventoren organizer-dashboard <operation> --url <convex-url> --token-env <NAME> [--json '<json>'] [--org-id <id>]

Operations (${organizerDashboardOperations.length}): ${organizerDashboardOperations.join(", ")}.
Or: organizer-dashboard <operation> --json '<json>'.

Reads the operation JSON from --json or stdin (UTF-8, max ${organizerDashboardRequestMaxBytes} bytes) and
validates it with the same shared schemas as the HTTP API. The auth credential
is read from the environment variable named by --token-env and is never
printed. context accepts an optional orgId via --org-id or JSON.
`

/**
 * Runs the organizer-dashboard CLI subcommand. Server environment only: reads
 * process-style env and stdin text supplied by the caller. Requires an
 * explicit --url (HTTP/S without embedded credentials) and a credential via
 * --token-env <NAME>; the credential value never appears on stdout. Returns
 * the process exit code (0 success, 1 backend/transport failure, 2 usage
 * error).
 */
export async function organizerDashboardCliRun(inputs: {
  readonly argv: readonly string[]
  readonly env: Record<string, string | undefined>
  readonly stdinText: string
  readonly stdout: (text: string) => void
  readonly backendFromUrl?: (url: string) => OrganizerDashboardHttpBackend
}): Promise<number> {
  const op = "organizerDashboardCliRun"
  const writeError = (code: string, message: string, exitCode: number): number => {
    inputs.stdout(
      JSON.stringify(
        organizerDashboardErrorEnvelopeCreate({
          code,
          message,
          requestId: crypto.randomUUID(),
          errorOp: op,
        }),
      ) + "\n",
    )
    return exitCode
  }
  const writeUsageError = (code: string, message: string): number => writeError(code, message, 2)

  const [subcommand, ...rest] = inputs.argv
  if (subcommand === "--help" || subcommand === "-h") {
    inputs.stdout(usageText)
    return 0
  }
  if (subcommand === undefined || !organizerDashboardOperationSet.has(subcommand)) {
    return writeUsageError("organizer-dashboard.unknown-operation", "Unknown operation")
  }
  const operation = subcommand as OrganizerDashboardOperation

  const options = organizerDashboardCliOptionsRead(rest)
  if (!options.success) return writeUsageError("organizer-dashboard.invalid-body", options.errorMessage)
  if (options.data.url === undefined) {
    return writeUsageError("organizer-dashboard.invalid-body", "Missing required --url")
  }
  let url: string
  try {
    const parsedUrl = new URL(options.data.url)
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return writeUsageError("organizer-dashboard.invalid-body", "Invalid --url")
    }
    if (parsedUrl.username !== "" || parsedUrl.password !== "") {
      return writeUsageError("organizer-dashboard.invalid-body", "Invalid --url")
    }
    url = parsedUrl.toString()
  } catch {
    return writeUsageError("organizer-dashboard.invalid-body", "Invalid --url")
  }
  if (options.data.tokenEnv === undefined) {
    return writeUsageError("organizer-dashboard.invalid-body", "Missing required --token-env")
  }
  const rawToken = inputs.env[options.data.tokenEnv]
  const token = rawToken === undefined ? undefined : rawToken.trim()
  if (token === undefined || token.length === 0) {
    return writeUsageError(
      "organizer-dashboard.unauthenticated",
      "Credential environment variable " + options.data.tokenEnv + " is not set",
    )
  }

  const rawBody = options.data.json ?? inputs.stdinText
  if (new TextEncoder().encode(rawBody).byteLength > organizerDashboardRequestMaxBytes) {
    return writeUsageError("organizer-dashboard.invalid-body", "Request body too large")
  }
  let bodyJson: unknown = {}
  if (rawBody.trim().length === 0) {
    if (
      options.data.json === undefined &&
      (operation === "context" ||
        operation === "admin-list" ||
        operation === "migration-plan" ||
        operation === "team-invitation-inbox")
    ) {
      bodyJson = {}
    } else {
      return writeUsageError("organizer-dashboard.invalid-body", "Request JSON required")
    }
  } else {
    try {
      bodyJson = JSON.parse(rawBody) as unknown
    } catch {
      return writeUsageError("organizer-dashboard.invalid-body", "Invalid JSON body")
    }
  }
  if (typeof bodyJson !== "object" || bodyJson === null || Array.isArray(bodyJson)) {
    return writeUsageError("organizer-dashboard.invalid-body", "Request body must be an object")
  }
  let mergedRecord = bodyJson as Record<string, unknown>
  if (mergedRecord.operation !== undefined && mergedRecord.operation !== operation) {
    return writeUsageError("organizer-dashboard.invalid-body", "Operation mismatch")
  }
  if (options.data.orgId !== undefined) {
    if (operation !== "context") {
      return writeUsageError("organizer-dashboard.invalid-body", "--org-id is only valid for context")
    }
    mergedRecord = { ...mergedRecord, orgId: options.data.orgId }
  }

  const parsed = organizerDashboardRequestParse({ ...mergedRecord, operation })
  if (!parsed.success) {
    const reason = parsed.errorData === "unknown-operation" ? "unknown-operation" : "invalid-body"
    return writeUsageError(
      reason === "unknown-operation" ? "organizer-dashboard.unknown-operation" : "organizer-dashboard.invalid-body",
      parsed.errorMessage,
    )
  }

  const backend = inputs.backendFromUrl?.(url) ?? organizerDashboardConvexBackendCreate(new ConvexHttpClient(url))
  try {
    const result = await organizerDashboardBackendDispatchRequest(backend, token, parsed.data)
    return organizerDashboardCliResultWrite(result, inputs.stdout)
  } catch {
    return writeError("organizer-dashboard.transport-unavailable", transportMessage, 1)
  }
}

function organizerDashboardCliResultWrite(
  result:
    | { readonly success: true; readonly data: unknown }
    | { readonly success: false; readonly op: string; readonly errorMessage: string; readonly code?: string },
  stdout: (text: string) => void,
): number {
  if (result.success) {
    stdout(JSON.stringify({ success: true, data: result.data }) + "\n")
    return 0
  }
  const code =
    typeof result.code === "string" && organizerDashboardErrorCatalogKeys.has(result.code)
      ? result.code
      : "platform.internal"
  stdout(
    JSON.stringify(
      organizerDashboardErrorEnvelopeCreate({
        code,
        message: result.errorMessage,
        requestId: crypto.randomUUID(),
        errorOp: result.op,
      }),
    ) + "\n",
  )
  return 1
}

const organizerDashboardErrorCatalogKeys: ReadonlySet<string> = new Set(Object.keys(organizerDashboardErrorCatalog))

function organizerDashboardCliOptionsRead(
  argv: readonly string[],
): { readonly success: true; readonly data: CliOptions } | { readonly success: false; readonly errorMessage: string } {
  const data: {
    url?: string
    tokenEnv?: string
    json?: string
    orgId?: string
  } = {}
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    if (flag === "--url" || flag === "--token-env" || flag === "--json" || flag === "--org-id") {
      const value = argv[index + 1]
      if (value === undefined || value.startsWith("--")) {
        return { success: false, errorMessage: "Missing value for " + flag }
      }
      if (flag === "--url") data.url = value
      if (flag === "--token-env") data.tokenEnv = value
      if (flag === "--json") data.json = value
      if (flag === "--org-id") data.orgId = value
      index += 1
      continue
    }
    return { success: false, errorMessage: "Unknown option " + String(flag) }
  }
  return { success: true, data }
}

type CliOptions = {
  readonly url?: string
  readonly tokenEnv?: string
  readonly json?: string
  readonly orgId?: string
}
