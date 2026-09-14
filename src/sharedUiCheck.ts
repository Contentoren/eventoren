import { readdir, readFile } from "node:fs/promises"
import { extname, join, relative, resolve } from "node:path"

const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"])
const projectRoot = resolve(".")
const sourceDirectory = join(projectRoot, "src")
const excludedFiles = new Set(["src/sharedUiCheck.ts", "src/ui/UiButton.tsx"])
const nativeButtonLiteral = "<" + "button"
const failures: string[] = []

const sourceFiles = await sourceFilesRead(sourceDirectory)
for (const sourceFile of sourceFiles) {
  const relativePath = relative(projectRoot, sourceFile).replaceAll("\\", "/")
  if (excludedFiles.has(relativePath)) continue

  let contents: string
  try {
    contents = await readFile(sourceFile, "utf8")
  } catch (error) {
    failures.push(relativePath + ": could not read source: " + String(error))
    continue
  }
  if (contents.includes(nativeButtonLiteral)) {
    failures.push(relativePath + ": application source contains " + nativeButtonLiteral + "; use a shared UI Button")
  }
}

if (failures.length > 0) {
  console.error("Shared UI source check failed:\n" + failures.map((failure) => "- " + failure).join("\n"))
  process.exitCode = 1
} else {
  console.log("Verified shared UI Button reuse in application source.")
}

async function sourceFilesRead(directory: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    failures.push("src: could not read application source: " + String(error))
    return []
  }

  entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
  const files: string[] = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isSymbolicLink()) {
      failures.push(relative(projectRoot, path).replaceAll("\\", "/") + ": refusing to inspect symbolic link")
      continue
    }
    if (entry.isDirectory()) {
      files.push(...(await sourceFilesRead(path)))
      continue
    }
    if (entry.isFile() && sourceExtensions.has(extname(entry.name))) files.push(path)
  }
  return files
}
