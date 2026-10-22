/**
 * Generates `src/utils/convex_client/convexFunctionCatalog.ts`: a checked-in
 * inventory of every Convex function (convex/*.ts re-exports resolved to
 * their src definitions) with kind and visibility, plus a best-effort
 * `acceptsToken` flag used by the generic CLI/MCP/TS-client dispatch to
 * decide whether the caller credential may be injected into args.
 *
 * Run: `bun run scripts/convexFunctionCatalogGenerate.ts`
 * The catalog sync test re-runs this generator and compares output, so
 * hand edits to the generated file fail CI; regenerate instead.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

export type ConvexFunctionKindValue =
  | "query"
  | "mutation"
  | "action"
  | "internalQuery"
  | "internalMutation"
  | "internalAction"

const kindPattern = "internalQuery|internalMutation|internalAction|query|mutation|action"

function resolveTarget(target: string): string | null {
  if (target.startsWith("#src/")) return `src/${target.slice("#src/".length)}`
  if (target.startsWith("./")) return `convex/${target.slice(2)}`
  if (target.startsWith("../")) return target
  return null
}

function withTs(path: string): string {
  if (path.endsWith(".ts")) return path
  if (path.endsWith(".js")) return `${path.slice(0, -".js".length)}.ts`
  return `${path}.ts`
}

function readFileOrNull(repoRoot: string, relativePath: string): string | null {
  try {
    return readFileSync(join(repoRoot, withTs(relativePath)), "utf8")
  } catch {
    return null
  }
}

function definitionKind(fileSource: string, exportName: string): ConvexFunctionKindValue | null {
  const direct = new RegExp(`export const ${exportName}\\s*=\\s*(${kindPattern})\\s*[(<{]`).exec(fileSource)
  if (direct) return direct[1] as ConvexFunctionKindValue
  return null
}

function definitionBody(fileSource: string, exportName: string): string | null {
  const start = fileSource.indexOf(`export const ${exportName}`)
  if (start === -1) return null
  const handlerIndex = fileSource.indexOf("handler", start)
  if (handlerIndex === -1) return null
  return fileSource.slice(start, handlerIndex)
}

function balancedSlice(source: string, openIndex: number): string | null {
  const pairs: Record<string, string> = { "{": "}", "(": ")", "[": "]" }
  const open = source[openIndex]
  const close = pairs[open ?? ""]
  if (!open || !close) return null
  let depth = 0
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index]
    if (char === open) depth += 1
    if (char === close) {
      depth -= 1
      if (depth === 0) return source.slice(openIndex, index + 1)
    }
  }
  return null
}

/**
 * Best-effort token detection. Returns true when the args block declares a
 * `token` field, false when args are provably tokenless (empty or an explicit
 * Omit idiom), and null when the shape cannot be determined statically.
 */
function acceptsTokenDetect(
  definitionFileSource: string,
  exportName: string,
  loadImportedFile: (importPath: string) => string | null,
): boolean | null {
  const body = definitionBody(definitionFileSource, exportName)
  if (!body) return null
  const argsIndex = body.indexOf("args:")
  if (argsIndex === -1) return false
  const afterArgs = body.slice(argsIndex + "args:".length).trimStart()
  if (afterArgs.startsWith("{}")) return false
  if (afterArgs.includes("Omit<") && afterArgs.includes('"token"')) return false
  if (afterArgs.startsWith("createTokenValidator(")) return true
  if (afterArgs.startsWith("{") || afterArgs.startsWith("v.object(") || afterArgs.startsWith("vObject")) {
    const openIndex = afterArgs.indexOf("{")
    const block = balancedSlice(afterArgs, openIndex)
    if (!block) return null
    return /(^|[\s,{])token\s*:/.test(block)
  }
  const identifier = /^[A-Za-z_$][\w$]*/.exec(afterArgs)?.[0]
  if (!identifier) return null
  const localFactoryPattern = new RegExp(
    `(?:const|export const)\\s+${identifier}\\s*=\\s*createTokenValidator\\s*\\(`,
  ).exec(definitionFileSource)
  if (localFactoryPattern) return true
  const localPattern = new RegExp(
    `(?:const|export const)\\s+${identifier}\\s*=\\s*(v\\.object\\(\\s*\\{|createTokenValidator\\(\\s*\\{|\\{)`,
  ).exec(definitionFileSource)
  if (localPattern) {
    if (localPattern[0].includes("createTokenValidator(")) return true
    const blockStart = (localPattern.index ?? 0) + localPattern[0].length - 1
    const block = balancedSlice(definitionFileSource, blockStart)
    if (!block) return null
    return /(^|[\s,{])token\s*:/.test(block)
  }
  for (const match of definitionFileSource.matchAll(/^import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/gm)) {
    const names = (match[1] ?? "").split(",").map((raw) =>
      raw
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim(),
    )
    if (!names.includes(identifier)) continue
    const importedSource = loadImportedFile(match[2] ?? "")
    if (!importedSource) return null
    const importedFactoryPattern = new RegExp(
      `(?:const|export const)\\s+${identifier}\\s*=\\s*createTokenValidator\\s*\\(`,
    ).exec(importedSource)
    if (importedFactoryPattern) return true
    const importedPattern = new RegExp(
      `(?:const|export const)\\s+${identifier}\\s*=\\s*(v\\.object\\(\\s*\\{|createTokenValidator\\(\\s*\\{|\\{)`,
    ).exec(importedSource)
    if (!importedPattern) return null
    if (importedPattern[0].includes("createTokenValidator(")) return true
    const blockStart = (importedPattern.index ?? 0) + importedPattern[0].length - 1
    const block = balancedSlice(importedSource, blockStart)
    if (!block) return null
    return /(^|[\s,{])token\s*:/.test(block)
  }
  return null
}

export type CatalogEntry = {
  readonly module: string
  readonly name: string
  readonly file: string
  readonly kind: ConvexFunctionKindValue
  readonly visibility: "public" | "internal"
  readonly acceptsToken: boolean | null
}

export function convexFunctionCatalogCollect(repoRoot: string): CatalogEntry[] {
  const convexDir = join(repoRoot, "convex")
  const files = readdirSync(convexDir)
    .filter((file) => file.endsWith(".ts"))
    .sort()
  const entries: CatalogEntry[] = []
  for (const file of files) {
    const module = file.replace(/\.ts$/, "")
    if (module === "schema" || module === "http" || module === "crons") continue
    const source = readFileSync(join(convexDir, file), "utf8")
    const reexportTargets = new Map<string, string>()
    for (const match of source.matchAll(/export\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) {
      const target = resolveTarget(match[2] ?? "")
      if (!target) continue
      for (const raw of (match[1] ?? "").split(",")) {
        const name = raw
          .trim()
          .split(/\s+as\s+/)
          .pop()
          ?.trim()
        if (name) reexportTargets.set(name, target)
      }
    }
    const directDefinitions = new Map<string, ConvexFunctionKindValue>()
    for (const match of source.matchAll(new RegExp(`export const (\\w+)\\s*=\\s*(${kindPattern})\\s*[(<{]`, "g"))) {
      directDefinitions.set(match[1] ?? "", match[2] as ConvexFunctionKindValue)
    }
    const bareExports = new Map<string, string>()
    const importTargets = new Map<string, string>()
    for (const match of source.matchAll(/^import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/gm)) {
      const target = resolveTarget(match[2] ?? "")
      if (!target) continue
      for (const raw of (match[1] ?? "").split(",")) {
        const name = raw
          .trim()
          .split(/\s+as\s+/)
          .pop()
          ?.trim()
        if (name) importTargets.set(name, target)
      }
    }
    for (const match of source.matchAll(/export\s*\{([^}]*)\}/g)) {
      const tail = source.slice(match.index ?? 0, (match.index ?? 0) + match[0].length + 80)
      if (/from\s*["']/.test(tail)) continue
      for (const raw of (match[1] ?? "").split(",")) {
        const name = raw
          .trim()
          .split(/\s+as\s+/)
          .pop()
          ?.trim()
        if (name && !bareExports.has(name)) bareExports.set(name, importTargets.get(name) ?? "")
      }
    }
    const push = (name: string, fileRelative: string | null, kind: ConvexFunctionKindValue | null): void => {
      if (!kind || !fileRelative) {
        entries.push({
          module,
          name,
          file: fileRelative ?? `convex/${file}`,
          kind: "query",
          visibility: "public",
          acceptsToken: null,
        })
        return
      }
      const fileSource = readFileOrNull(repoRoot, fileRelative)
      const definitionDir = fileRelative.includes("/") ? fileRelative.slice(0, fileRelative.lastIndexOf("/")) : ""
      const loadImportedFile = (importPath: string): string | null => {
        if (importPath.startsWith("#src/")) return readFileOrNull(repoRoot, `src/${importPath.slice("#src/".length)}`)
        if (importPath.startsWith("./") || importPath.startsWith("../")) {
          const segments = [...definitionDir.split("/").filter(Boolean), ...importPath.split("/")]
          const normalized: string[] = []
          for (const segment of segments) {
            if (segment === "." || segment === "") continue
            if (segment === "..") normalized.pop()
            else normalized.push(segment)
          }
          return readFileOrNull(repoRoot, normalized.join("/"))
        }
        return null
      }
      entries.push({
        module,
        name,
        file: withTs(fileRelative),
        kind,
        visibility: kind.startsWith("internal") ? "internal" : "public",
        acceptsToken: fileSource ? acceptsTokenDetect(fileSource, name, loadImportedFile) : null,
      })
    }
    for (const [name, target] of reexportTargets) {
      const fileSource = readFileOrNull(repoRoot, target)
      push(name, target, fileSource ? definitionKind(fileSource, name) : null)
    }
    for (const [name, target] of bareExports) {
      if (reexportTargets.has(name) || directDefinitions.has(name)) continue
      const fileSource = target ? readFileOrNull(repoRoot, target) : null
      push(name, target || null, fileSource ? definitionKind(fileSource, name) : null)
    }
    for (const [name, kind] of directDefinitions) {
      const fileSource = readFileSync(join(convexDir, file), "utf8")
      entries.push({
        module,
        name,
        file: `convex/${file}`,
        kind,
        visibility: kind.startsWith("internal") ? "internal" : "public",
        acceptsToken: acceptsTokenDetect(fileSource, name, () => null),
      })
    }
  }
  return entries.sort((a, b) =>
    a.module === b.module ? a.name.localeCompare(b.name) : a.module.localeCompare(b.module),
  )
}

export function convexFunctionCatalogRender(entries: readonly CatalogEntry[]): string {
  const lines: string[] = [
    "/**",
    " * GENERATED by scripts/convexFunctionCatalogGenerate.ts. Do not edit.",
    " * Regenerate: `bun run scripts/convexFunctionCatalogGenerate.ts`.",
    " */",
    "",
    'export type ConvexFunctionKind = "query" | "mutation" | "action"',
    'export type ConvexFunctionInternalKind = "internalQuery" | "internalMutation" | "internalAction"',
    'export type ConvexFunctionVisibility = "public" | "internal"',
    "",
    "export type ConvexFunctionCatalogEntry = {",
    "  readonly kind: ConvexFunctionKind | ConvexFunctionInternalKind",
    "  readonly visibility: ConvexFunctionVisibility",
    "  /**",
    "   * True when the function args declare a `token` field so generic",
    "   * surfaces may inject the caller credential. False when provably",
    "   * tokenless. Null when the shape could not be determined statically:",
    "   * callers must not inject and must pass args exactly.",
    "   */",
    "  readonly acceptsToken: boolean | null",
    "}",
    "",
    "export const convexFunctionCatalog: Record<string, Record<string, ConvexFunctionCatalogEntry>> = {",
  ]
  let currentModule = ""
  for (const entry of entries) {
    if (entry.module !== currentModule) {
      if (currentModule !== "") lines.push("},")
      lines.push(`  ${JSON.stringify(entry.module)}: {`)
      currentModule = entry.module
    }
    lines.push(
      `    ${JSON.stringify(entry.name)}: { kind: ${JSON.stringify(entry.kind)}, visibility: ${JSON.stringify(entry.visibility)}, acceptsToken: ${entry.acceptsToken === null ? "null" : String(entry.acceptsToken)} },`,
    )
  }
  if (currentModule !== "") lines.push("  },")
  lines.push("}")
  lines.push("")
  const publicCount = entries.filter((entry) => entry.visibility === "public").length
  const internalCount = entries.length - publicCount
  const countKind = (kind: string): number => entries.filter((entry) => entry.kind === kind).length
  lines.push("export const convexFunctionCatalogTotals = {")
  lines.push(`  modules: ${new Set(entries.map((entry) => entry.module)).size},`)
  lines.push(`  functions: ${entries.length},`)
  lines.push(`  public: ${publicCount},`)
  lines.push(`  internal: ${internalCount},`)
  lines.push(`  query: ${countKind("query")},`)
  lines.push(`  mutation: ${countKind("mutation")},`)
  lines.push(`  action: ${countKind("action")},`)
  lines.push(`  internalQuery: ${countKind("internalQuery")},`)
  lines.push(`  internalMutation: ${countKind("internalMutation")},`)
  lines.push(`  internalAction: ${countKind("internalAction")},`)
  lines.push("} as const")
  lines.push("")
  return `${lines.join("\n")}`
}

const invokedAsMain =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  (process.argv[1] ?? "").endsWith("convexFunctionCatalogGenerate.ts")

if (invokedAsMain) {
  const repoRoot = process.cwd()
  const entries = convexFunctionCatalogCollect(repoRoot)
  const rendered = convexFunctionCatalogRender(entries)
  writeFileSync(join(repoRoot, "src/utils/convex_client/convexFunctionCatalog.ts"), rendered)
  const unknownToken = entries.filter((entry) => entry.acceptsToken === null).length
  const publicCount = entries.filter((entry) => entry.visibility === "public").length
  process.stdout.write(
    `convexFunctionCatalog: ${entries.length} functions in ${new Set(entries.map((entry) => entry.module)).size} modules (${publicCount} public, ${entries.length - publicCount} internal, ${unknownToken} unknown-token)\n`,
  )
}
