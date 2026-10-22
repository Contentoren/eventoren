import { ConvexHttpClient } from "convex/browser"
import { apiClientConvexCall } from "../client/apiClientConvexCall.js"
import { organizerDashboardRequestMaxBytes } from "../organizer/dashboard/api/organizerDashboardRequestMaxBytes.js"
import { convexCallEnvFileLoad, convexCallUrlResolve } from "./convexCallEnvLoad.js"

export type ConvexCallCliBackend = Pick<ConvexHttpClient, "query" | "mutation" | "action">

const usageText = `Usage: eventoren convex-call <module:function> [--env development|production] [--url <convex-url>] [--token <t> | --token-env <NAME>] [--json '<json>']

Calls any public Convex function through the static catalog
(src/utils/convex_client/convexFunctionCatalog.ts). Examples:

  eventoren convex-call catalog:catalogEventListPublishedPageQuery --env development --json '{"filter":{"query":"","location":"","category":"","timeWindow":"alle"},"paginationOpts":{"numItems":10,"cursor":null}}'
  eventoren convex-call publicProjectInfo:publicProjectInfo --env production

--env loads .env.development (default) or .env.production from the working
directory for the deployment URL (CONVEX_URL, else CONVEX_SELF_HOSTED_URL,
VITE_CONVEX_URL, PUBLIC_BASE_URL_CONVEX). --url overrides it. Args come from
--json or stdin; the credential defaults to EVENTOREN_API_KEY and is injected
as the "token" arg only for functions whose args declare one.
`

function flagRead(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}

export async function convexCallCliRun(inputs: {
  readonly argv: readonly string[]
  readonly env?: Record<string, string | undefined>
  readonly envDir?: string
  readonly stdinText?: string
  readonly stdout?: (text: string) => void
  readonly stderr?: (text: string) => void
  readonly clientFromUrl?: (url: string) => ConvexCallCliBackend
}): Promise<number> {
  const env = inputs.env ?? process.env
  const stdout = inputs.stdout ?? ((text: string) => process.stdout.write(text))
  const stderr = inputs.stderr ?? ((text: string) => process.stderr.write(text))
  const fail = (message: string): number => {
    stderr(`error: ${message}\n`)
    return 1
  }

  const [target, ...rest] = inputs.argv
  if (target === undefined || target === "--help" || target === "-h") {
    stdout(usageText)
    return target === undefined ? 1 : 0
  }
  const separator = target.indexOf(":")
  if (separator === -1) return fail(`invalid function "${target}", expected <module:function>`)
  const module = target.slice(0, separator)
  const name = target.slice(separator + 1)
  if (module.length === 0 || name.length === 0) return fail(`invalid function "${target}"`)

  const envName = flagRead(rest, "env") ?? "development"
  if (envName !== "development" && envName !== "production") return fail(`invalid --env "${envName}"`)
  const fileVars = convexCallEnvFileLoad(inputs.envDir ?? process.cwd(), envName)
  const url = convexCallUrlResolve({ flagUrl: flagRead(rest, "url"), env, fileVars })
  if (!url) return fail(`no Convex URL found (use --url or provide .env.${envName} with CONVEX_URL)`)

  const tokenEnv = flagRead(rest, "token-env")
  const token = flagRead(rest, "token") ?? (tokenEnv ? env[tokenEnv] : undefined) ?? env["EVENTOREN_API_KEY"]

  const rawBody = flagRead(rest, "json") ?? inputs.stdinText ?? ""
  if (new TextEncoder().encode(rawBody).byteLength > organizerDashboardRequestMaxBytes) {
    return fail("Request body too large")
  }
  let args: Record<string, unknown> = {}
  if (rawBody.trim().length > 0) {
    try {
      const parsed = JSON.parse(rawBody) as unknown
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return fail("Request body must be a JSON object")
      }
      args = parsed as Record<string, unknown>
    } catch {
      return fail("Invalid JSON body")
    }
  }

  const client = inputs.clientFromUrl?.(url) ?? new ConvexHttpClient(url)
  const result = await apiClientConvexCall(
    { module, name: name, args, ...(token === undefined ? {} : { token }) },
    client as ConvexHttpClient,
  )
  if (!result.success) {
    return fail(`${result.error.message} (status ${result.error.status})`)
  }
  stdout(`${JSON.stringify(result.data, null, 2)}\n`)
  return 0
}
