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

/** Split an export/import list entry into exported and local names. */
function exportPair(raw: string): { exported: string; local: string } | null {
  const withoutComment = raw
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n")
    .trim()
  if (!withoutComment) return null
  const parts = withoutComment.split(/\s+as\s+/).map((part) => part.trim())
  if (parts.length === 2) {
    if (!parts[0] || !parts[1]) return null
    return { exported: parts[1] ?? "", local: parts[0] ?? "" }
  }
  const name = (parts[0] ?? "").trim()
  if (!name) return null
  return { exported: name, local: name }
}

/** Replace string/template literals and comments with spaces (length-preserving). */
function maskStringsAndComments(source: string): string {
  let out = ""
  let index = 0
  while (index < source.length) {
    const char = source[index]
    const next = source[index + 1]
    if (char === "/" && next === "/") {
      let end = index
      while (end < source.length && source[end] !== "\n") end += 1
      out += " ".repeat(end - index)
      index = end
      continue
    }
    if (char === "/" && next === "*") {
      const close = source.indexOf("*/", index + 2)
      const end = close === -1 ? source.length : close + 2
      out += " ".repeat(end - index)
      index = end
      continue
    }
    if (char === "'" || char === '"' || char === "`") {
      let end = index + 1
      while (end < source.length) {
        if (source[end] === "\\") {
          end += 2
          continue
        }
        if (source[end] === char) {
          end += 1
          break
        }
        end += 1
      }
      // Whole template literals (including ${...}) are masked: token fields
      // never live inside interpolations, but braces there would corrupt
      // balance counting.
      out += " ".repeat(end - index)
      index = end
      continue
    }
    out += char
    index += 1
  }
  return out
}

/** Strips a trailing depth-0 `satisfies Type` annotation from an RHS string. */
export function stripSatisfiesSuffix(rhs: string): string {
  let current = rhs.trimEnd()
  for (;;) {
    const masked = maskStringsAndComments(current)
    const match = /\bsatisfies\b/g.exec(masked)
    if (!match || match.index === undefined) return current
    let depth = 0
    let isTopLevel = true
    for (let index = 0; index < match.index; index += 1) {
      const char = masked[index]
      if (char === "{" || char === "(" || char === "[") depth += 1
      if (char === "}" || char === ")" || char === "]") depth -= 1
    }
    isTopLevel = depth === 0
    if (!isTopLevel) return current
    current = current.slice(0, match.index).trimEnd()
  }
}

/**
 * Remainder of an `export function NAME(` (or `function NAME(`) declaration.
 * Bodies rarely resolve to a token shape and fall through to null, but
 * matching them keeps identifier-following total over const and function
 * declarations alike.
 */
function functionRhs(source: string, identifier: string): string | null {
  const pattern = new RegExp(`(?:export\\s+function|function)\\s+${identifier}\\s*(?:<[^<>]*>)?\\(`).exec(source)
  if (!pattern) return null
  return stripSatisfiesSuffix(source.slice((pattern.index ?? 0) + pattern[0].length).trimStart())
}

/** A `const ID = RHS` (or `export const`) declaration, tolerating a type annotation. */
function constRhs(source: string, identifier: string): string | null {
  const pattern = new RegExp(`(?:const|export const)\\s+${identifier}(?:\\s*:[^=;]+)?\\s*=\\s*`).exec(source)
  if (!pattern) return functionRhs(source, identifier)
  return stripSatisfiesSuffix(source.slice((pattern.index ?? 0) + pattern[0].length).trimStart())
}

function balancedSlice(source: string, openIndex: number): string | null {
  const pairs: Record<string, string> = { "{": "}", "(": ")", "[": "]" }
  const open = source[openIndex]
  const close = pairs[open ?? ""]
  if (!open || !close) return null
  // Match over a masked copy so braces inside strings, template literals and
  // comments cannot corrupt depth counting; indices are length-preserving.
  const masked = maskStringsAndComments(source)
  let depth = 0
  for (let index = openIndex; index < masked.length; index += 1) {
    const char = masked[index]
    if (char === open) depth += 1
    if (char === close) {
      depth -= 1
      if (depth === 0) return source.slice(openIndex, index + 1)
    }
  }
  return null
}

/**
 * Reports whether an args block declares a `token` field. Quoted keys
 * (`"token":` / `'token':`) and optional keys (`token?:`) count; string
 * values, template literals and comments mentioning `token:` are skipped.
 */
export function convexCatalogTokenScan(block: string): boolean {
  let index = 0
  while (index < block.length) {
    const char = block[index] ?? ""
    if (char === "/" && block[index + 1] === "/") {
      while (index < block.length && block[index] !== "\n") index += 1
      continue
    }
    if (char === "/" && block[index + 1] === "*") {
      const close = block.indexOf("*/", index + 2)
      index = close === -1 ? block.length : close + 2
      continue
    }
    const preceding = index === 0 ? "" : (block[index - 1] ?? "")
    const isKeyContext = index === 0 || /[\s,{]/.test(preceding)
    if (char === "'" || char === '"' || char === "`") {
      let end = index + 1
      while (end < block.length) {
        if (block[end] === "\\") {
          end += 2
          continue
        }
        if (block[end] === char) break
        end += 1
      }
      const key = block.slice(index + 1, end)
      let after = end + 1
      while (after < block.length && /\s/.test(block[after] ?? "")) after += 1
      if (isKeyContext && key === "token" && block[after] === ":") return true
      index = end + 1
      continue
    }
    if (/[A-Za-z_$]/.test(char)) {
      let end = index + 1
      while (end < block.length && /[\w$]/.test(block[end] ?? "")) end += 1
      const key = block.slice(index, end)
      let after = end
      while (after < block.length && /\s/.test(block[after] ?? "")) after += 1
      if (block[after] === "?") {
        let optionalEnd = after + 1
        while (optionalEnd < block.length && /\s/.test(block[optionalEnd] ?? "")) optionalEnd += 1
        if (isKeyContext && key === "token" && block[optionalEnd] === ":") return true
      } else if (isKeyContext && key === "token" && block[after] === ":") {
        return true
      }
      index = end
      continue
    }
    index += 1
  }
  return false
}

export type ImportLoader = (fromFile: string, importPath: string) => { source: string; file: string } | null

/**
 * File loader resolving `#src/`, `./` and `../` imports against a repo root.
 * Shared by catalog collection and unit tests.
 */
export function convexCatalogImportLoader(repoRoot: string): ImportLoader {
  return (fromFile, importPath) => {
    if (importPath.startsWith("#src/")) {
      const file = `src/${importPath.slice("#src/".length)}`
      const source = readFileOrNull(repoRoot, file)
      return source === null ? null : { source, file: withTs(file) }
    }
    if (importPath.startsWith("./") || importPath.startsWith("../")) {
      const fromDir = fromFile.includes("/") ? fromFile.slice(0, fromFile.lastIndexOf("/")) : ""
      const segments = [...fromDir.split("/").filter(Boolean), ...importPath.split("/")]
      const normalized: string[] = []
      for (const segment of segments) {
        if (segment === "." || segment === "") continue
        if (segment === "..") normalized.pop()
        else normalized.push(segment)
      }
      const file = normalized.join("/")
      const source = readFileOrNull(repoRoot, file)
      return source === null ? null : { source, file: withTs(file) }
    }
    return null
  }
}

/**
 * Token classification for a single args expression without imports. Used by
 * the catalog walk (with a real loader) and by unit tests as synthetic
 * probes for loader-independent shapes (Omit idioms, quoted keys,
 * comments, strings, object-validator calls).
 */
export function convexCatalogTokenDetect(expression: string): boolean | null {
  return argsExprAcceptsToken(expression, "", "", () => null, 6)
}

/**
 * True when the expression itself is an `Omit<..., "token">` idiom. The
 * `"token"` literal must sit inside the Omit's own angle brackets: validator
 * files commonly contain a later `Omit<X, "token">` handler annotation, and
 * an unscoped substring check would misfire on that trailing text (const RHS
 * extraction returns the remainder of the file).
 */
function omitTokenIdiom(expression: string): boolean {
  const masked = maskStringsAndComments(expression)
  const start = /^Omit\s*</.exec(masked)
  if (!start) return false
  let depth = 0
  for (let index = start[0].length - 1; index < masked.length; index += 1) {
    const char = masked[index]
    if (char === "<") depth += 1
    else if (char === ">") {
      if (masked[index - 1] === "=") continue // `=>` in function types
      depth -= 1
      if (depth === 0) {
        // Only an exact-`token` string literal counts; prose inside a
        // longer literal (e.g. "no token here") must not match. The check
        // runs on the unmasked span because masking erases the quotes.
        const span = expression.slice(0, index + 1)
        for (const literal of span.matchAll(/"([^"]*)"|'([^']*)'/g)) {
          if (literal[1] === "token" || literal[2] === "token") return true
        }
        return false
      }
    }
  }
  return false
}

function acceptsTokenDetect(
  definitionFileSource: string,
  definitionFile: string,
  exportName: string,
  loadImportedFile: ImportLoader,
): boolean | null {
  const body = definitionBody(definitionFileSource, exportName)
  if (!body) return null
  const argsIndex = body.indexOf("args:")
  if (argsIndex === -1) return false
  const afterArgs = body.slice(argsIndex + "args:".length).trimStart()
  return argsExprAcceptsToken(afterArgs, definitionFileSource, definitionFile, loadImportedFile, 6)
}

/**
 * Best-effort token detection. Returns true when the args block declares a
 * `token` field (directly or via createTokenValidator), false when args are
 * provably tokenless (empty, an explicit Omit idiom, or
 * createUserIdValidator which adds only `userId`), and null when the shape
 * cannot be determined statically.
 *
 * Validator identifiers are followed through `const` alias chains (local
 * first, then imports) with a fuel limit so `args: groupCreateValidator`
 * resolves through `groupCreateConvexValidator = v.object(fields)`.
 */
function argsExprAcceptsToken(
  expression: string,
  currentSource: string,
  currentFile: string,
  loadImportedFile: ImportLoader,
  fuel: number,
): boolean | null {
  const trimmed = expression.trimStart()
  if (trimmed.startsWith("{}")) return false
  if (omitTokenIdiom(trimmed)) return false
  if (/^createTokenValidator\s*\(/.test(trimmed)) return true
  // createUserIdValidator adds a `userId` field (verified in
  // src/utils/convex_backend/createUserIdValidator.ts), never a token.
  if (/^createUserIdValidator\s*\(/.test(trimmed)) return false
  if (trimmed.startsWith("{") || trimmed.startsWith("vObject")) {
    const openIndex = trimmed.indexOf("{")
    const block = balancedSlice(trimmed, openIndex)
    if (!block) return null
    return convexCatalogTokenScan(block)
  }
  // Object-validator calls (`v.object(`, `a.object(`, ...): inspect the
  // inner fields expression with the same rules.
  if (/^[\w$.]*[Oo]bject\s*\(/.test(trimmed)) {
    const inner = balancedSlice(trimmed, trimmed.indexOf("("))
    if (!inner) return null
    if (fuel <= 0) return null
    return argsExprAcceptsToken(inner.slice(1, -1), currentSource, currentFile, loadImportedFile, fuel - 1)
  }
  const identifier = /^[A-Za-z_$][\w$]*/.exec(trimmed)?.[0]
  if (!identifier || fuel <= 0) return null
  const rhs = constRhs(currentSource, identifier)
  if (rhs) return argsExprAcceptsToken(rhs, currentSource, currentFile, loadImportedFile, fuel - 1)
  const imported = importLocalSource(currentSource, currentFile, identifier, loadImportedFile)
  if (!imported) return null
  const importedRhs = constRhs(imported.source, imported.local)
  if (!importedRhs) return null
  return argsExprAcceptsToken(importedRhs, imported.source, imported.file, loadImportedFile, fuel - 1)
}

/** Resolve an imported identifier to the source file and its local name. */
function importLocalSource(
  currentSource: string,
  currentFile: string,
  identifier: string,
  loadImportedFile: ImportLoader,
): { source: string; local: string; file: string } | null {
  for (const match of currentSource.matchAll(/^import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/gm)) {
    const pairs = (match[1] ?? "")
      .split(",")
      .map((raw) => exportPair(raw))
      .filter((pair) => pair !== null)
    const pair = pairs.find((candidate) => candidate.exported === identifier)
    if (!pair) continue
    const loaded = loadImportedFile(currentFile, match[2] ?? "")
    if (!loaded) return null
    return { source: loaded.source, local: pair.local, file: loaded.file }
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
    const reexportTargets = new Map<string, { target: string; local: string }>()
    for (const match of source.matchAll(/export\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) {
      const target = resolveTarget(match[2] ?? "")
      if (!target) continue
      for (const raw of (match[1] ?? "").split(",")) {
        const pair = exportPair(raw)
        if (pair) reexportTargets.set(pair.exported, { target, local: pair.local })
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
    const push = (
      name: string,
      fileRelative: string | null,
      kind: ConvexFunctionKindValue | null,
      lookup = name,
    ): void => {
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
      const loadImportedFile = convexCatalogImportLoader(repoRoot)
      entries.push({
        module,
        name,
        file: withTs(fileRelative),
        kind,
        visibility: kind.startsWith("internal") ? "internal" : "public",
        acceptsToken: fileSource
          ? acceptsTokenDetect(fileSource, withTs(fileRelative), lookup, loadImportedFile)
          : null,
      })
    }
    for (const [name, reexport] of reexportTargets) {
      const fileSource = readFileOrNull(repoRoot, reexport.target)
      push(name, reexport.target, fileSource ? definitionKind(fileSource, reexport.local) : null, reexport.local)
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
        acceptsToken: acceptsTokenDetect(fileSource, `convex/${file}`, name, () => null),
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
