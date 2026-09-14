import { readFile, readdir } from "node:fs/promises"
import { extname, join, resolve } from "node:path"

const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"])
const artifactExtensions = new Set([".js", ".jsx", ".mjs", ".cjs", ".html", ".css", ".json", ".map", ".svg", ".txt"])
const ignoredArtifactFileNames = new Set(["_worker.js"])
const importSpecifierPattern = /\b(?:from\s*|import\s*(?:\(\s*)?|require\s*\(\s*)["']([^"']+)["']/gu
const environmentPattern = /\b(?:process|Bun|Deno)\s*\.\s*env\b|\bimport\.meta\.env\b/gu
const secretIdentifierPattern =
  /\b(?:SECRET|PASSWORD|TOKEN|PRIVATE_KEY|DATABASE_URL|API_KEY|CREDENTIALS?)\b|\b[A-Z][A-Z0-9_]*(?:SECRET|PASSWORD|TOKEN|PRIVATE_KEY|CREDENTIALS?)[A-Z0-9_]*\b/gu
const forbiddenModulePatterns = [
  ["filesystem", /^(?:node:)?(?:fs|path|os|child_process)(?:\/|$)/u],
  ["server-runtime", /^(?:node:|bun:)?process(?:\/|$)/u],
  ["sqlite", /^(?:node:|bun:)?sqlite(?:\/|$)|^(?:better-sqlite3|sqlite3|drizzle-orm|@libsql\/|@electric-sql\/)/u],
  [
    "server-sdk",
    /^(?:convex(?!\/browser(?:\/|$))|#convex(?!\/_generated(?:\/|$))|#src\/(?:auth\/convex|auth\/server|utils\/convex_backend)(?:\/|$)|@convex-dev\/|@convex\/|@zitadel\/|@adaptive-ds\/(?:assets-service|convex|zitadel|server)(?:-[^/]+)?|@prisma\/client|prisma|postgres|pg|mysql2|redis|ioredis|server-only)(?:\/|$)/u,
  ],
] as const

type FileEntry = { readonly path: string; readonly artifact: boolean; readonly scope: "client" | "shared" }

const clientSourceFiles = await filesRead(join(resolve("."), "src", "client"), sourceExtensions, false, "client")
const sharedSourceFiles = await filesRead(join(resolve("."), "src", "shared"), sourceExtensions, false, "shared")
const artifactFiles = await filesRead(join(resolve("."), "dist", "client"), artifactExtensions, true)
const violations: string[] = []

for (const file of [...clientSourceFiles, ...sharedSourceFiles, ...artifactFiles]) {
  const contents = await readFile(file.path, "utf8")
  const prefix = file.artifact ? "client-artifact" : file.scope + "-source"
  for (const match of contents.matchAll(importSpecifierPattern)) {
    const moduleSpecifier = match[1]
    if (moduleSpecifier === undefined) continue
    const normalized = moduleSpecifier.replaceAll("\\", "/")
    if (
      normalized === "#server" ||
      normalized.startsWith("#server/") ||
      normalized === "@server" ||
      normalized.startsWith("@server/") ||
      normalized.split("/").includes("server")
    ) {
      violations.push(file.path + ": " + prefix + "-server-import: " + moduleSpecifier)
      continue
    }
    const forbidden = forbiddenModulePatterns.find(([, pattern]) => pattern.test(moduleSpecifier))
    if (forbidden !== undefined)
      violations.push(file.path + ": " + prefix + "-" + forbidden[0] + "-module: " + moduleSpecifier)
  }
  if (environmentPattern.test(contents))
    violations.push(file.path + ": " + prefix + "-environment: server environment access")
  environmentPattern.lastIndex = 0
  if (secretIdentifierPattern.test(contents))
    violations.push(file.path + ": " + prefix + "-secret: server credential name")
  secretIdentifierPattern.lastIndex = 0
}

if (violations.length > 0) {
  console.error("Webapp client/server boundary check failed:")
  for (const violation of violations) console.error("- " + violation)
  process.exitCode = 1
}

async function filesRead(
  directory: string,
  extensions: ReadonlySet<string>,
  artifact: boolean,
  scope: "client" | "shared" = "client",
): Promise<FileEntry[]> {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return []
    throw error
  }

  const files: FileEntry[] = []
  entries.sort((left, right) => left.name.localeCompare(right.name))
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isSymbolicLink()) throw new Error("Refusing to inspect symbolic link " + path)
    if (entry.isDirectory()) files.push(...(await filesRead(path, extensions, artifact, scope)))
    else if (
      entry.isFile() &&
      (artifact || extensions.has(extname(entry.name))) &&
      !(artifact && ignoredArtifactFileNames.has(entry.name))
    )
      files.push({ path, artifact, scope })
  }
  return files
}
