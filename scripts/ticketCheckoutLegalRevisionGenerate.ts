import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const rootDirectory = process.cwd()
const revisionPath = join(rootDirectory, "src", "ticketing", "ticketCheckoutLegalDocumentRevision.ts")
const snapshotPath = join(rootDirectory, "src", "ticketing", "ticketCheckoutLegalDocumentSnapshot.ts")

const markdownBodyRead = async (path: string): Promise<string> => {
  const source = await readFile(join(rootDirectory, path), "utf8")
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/u, "").trim()
}

const termsMarkdown = await markdownBodyRead("src/legal/agb.md")
const privacyMarkdown = await markdownBodyRead("src/legal/datenschutz.md")
const canonicalSnapshot = JSON.stringify({ termsMarkdown, privacyMarkdown })
const revision = `sha256:${createHash("sha256").update(canonicalSnapshot, "utf8").digest("hex")}`
const snapshotOutput = `// Generated from src/legal/agb.md and src/legal/datenschutz.md; do not edit manually.\nexport const ticketCheckoutLegalDocumentSnapshot = {\n  termsMarkdown:\n    ${JSON.stringify(termsMarkdown)},\n  privacyMarkdown:\n    ${JSON.stringify(privacyMarkdown)},\n}\n`
const output = `// Generated from the checkout legal Markdown sources; update with\n// \`bun run legal:checkout-revision\` whenever agb.md or datenschutz.md changes.\nexport const ticketCheckoutLegalDocumentRevision =\n  ${JSON.stringify(revision)}\n`

const current = await readFile(revisionPath, "utf8").catch(() => undefined)
if (current !== output) await writeFile(revisionPath, output, "utf8")
const currentSnapshot = await readFile(snapshotPath, "utf8").catch(() => undefined)
if (currentSnapshot !== snapshotOutput) await writeFile(snapshotPath, snapshotOutput, "utf8")
process.stdout.write(`${revision}\n`)
