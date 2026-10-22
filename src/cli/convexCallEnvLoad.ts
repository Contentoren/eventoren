import { readFileSync } from "node:fs"
import { join } from "node:path"

export type ConvexCallEnvName = "development" | "production"

const urlKeys = ["CONVEX_URL", "CONVEX_SELF_HOSTED_URL", "VITE_CONVEX_URL", "PUBLIC_BASE_URL_CONVEX"] as const

/**
 * Minimal dotenv parser for `.env.development` / `.env.production`. Handles
 * KEY=value, KEY="quoted value", KEY='single', `export KEY=value`, comments
 * and blank lines. Later files never override values already present in
 * process env; resolution order is handled by convexCallUrlResolve.
 */
export function convexCallEnvFileParse(content: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim()
    if (line === "" || line.startsWith("#")) continue
    const withoutExport = line.startsWith("export ") ? line.slice("export ".length).trimStart() : line
    const separator = withoutExport.indexOf("=")
    if (separator === -1) continue
    const key = withoutExport.slice(0, separator).trim()
    if (!/^[A-Za-z_][\w.]*$/.test(key)) continue
    let value = withoutExport.slice(separator + 1).trim()
    if (value.startsWith('"')) {
      const closing = value.indexOf('"', 1)
      value = (closing === -1 ? value.slice(1) : value.slice(1, closing))
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
    } else if (value.startsWith("'")) {
      const closing = value.indexOf("'", 1)
      value = closing === -1 ? value.slice(1) : value.slice(1, closing)
    } else {
      const commentIndex = value.indexOf(" #")
      value = (commentIndex === -1 ? value : value.slice(0, commentIndex)).trim()
    }
    vars[key] = value
  }
  return vars
}

export function convexCallEnvFileLoad(envDir: string, envName: string): Record<string, string> {
  try {
    return convexCallEnvFileParse(readFileSync(join(envDir, `.env.${envName}`), "utf8"))
  } catch {
    return {}
  }
}

/**
 * Resolves the Convex deployment URL. Priority: explicit --url flag, then
 * process env, then the `.env.<environment>` file. CONVEX_URL is the
 * documented agent-facing variable; the self-hosted and Vite variants are
 * accepted as fallbacks because existing env files standardize on them.
 */
export function convexCallUrlResolve(inputs: {
  readonly flagUrl?: string | undefined
  readonly env: Record<string, string | undefined>
  readonly fileVars: Record<string, string>
}): string | undefined {
  if (inputs.flagUrl !== undefined && inputs.flagUrl.length > 0) return inputs.flagUrl
  for (const key of urlKeys) {
    const fromEnv = inputs.env[key]
    if (fromEnv !== undefined && fromEnv.length > 0) return fromEnv
  }
  for (const key of urlKeys) {
    const fromFile = inputs.fileVars[key]
    if (fromFile !== undefined && fromFile.length > 0) return fromFile
  }
  return undefined
}
