#!/usr/bin/env bun

import { cliVersionMetadataRender } from "./cliVersionMetadata.js"
import { organizerDashboardRequestMaxBytes } from "./organizer/dashboard/api/organizerDashboardRequestMaxBytes.ts"

const commandName = "eventoren"
const cliArguments = Bun.argv.slice(2)
const versionVerbose = cliVersionVerboseRead(cliArguments)

class OrganizerDashboardStdinLimitError extends Error {
  constructor() {
    super("Request body too large")
  }
}

/**
 * Bounded stdin reader: counts raw bytes while streaming and throws
 * OrganizerDashboardStdinLimitError when the bound is exceeded or the bytes
 * are not valid UTF-8, so an unbounded pipe can never fill memory here. The
 * CLI layer reports the limit as invalid-body without echoing input.
 */
async function organizerDashboardStdinRead(): Promise<string> {
  if (process.stdin.isTTY) return ""
  const reader = Bun.stdin.stream().getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const next = await reader.read()
    if (next.done) break
    total += next.value.byteLength
    if (total > organizerDashboardRequestMaxBytes) {
      await reader.cancel().catch(() => undefined)
      throw new OrganizerDashboardStdinLimitError()
    }
    chunks.push(next.value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    throw new OrganizerDashboardStdinLimitError()
  }
}

if (versionVerbose !== undefined) {
  process.stdout.write(cliVersionMetadataRender(versionVerbose))
} else if (cliArguments[0] === "organizer-dashboard") {
  const { organizerDashboardCliRun } = await import("./cli/organizerDashboardCliRun.js")
  const { organizerDashboardErrorEnvelopeCreate } = await import(
    "./organizer/dashboard/api/organizerDashboardErrorEnvelopeCreate.js"
  )
  let stdinText: string
  try {
    stdinText = await organizerDashboardStdinRead()
  } catch (error) {
    if (error instanceof OrganizerDashboardStdinLimitError) {
      process.stdout.write(
        JSON.stringify(
          organizerDashboardErrorEnvelopeCreate({
            code: "organizer-dashboard.invalid-body",
            message: "Request body too large",
            requestId: crypto.randomUUID(),
            errorOp: "organizerDashboardStdinRead",
          }),
        ) + "\n",
      )
      process.exit(2)
    }
    throw error
  }
  const exitCode = await organizerDashboardCliRun({
    argv: cliArguments.slice(1),
    env: process.env as Record<string, string | undefined>,
    stdinText,
    stdout: (text) => process.stdout.write(text),
  })
  if (exitCode !== 0) process.exit(exitCode)
} else {
  const apiClient = (await import("./client/apiClient.js")).apiClientCreate()
  if (Bun.argv.includes("--help")) {
    console.log(`Usage: ${commandName}`)
  }
}

function cliVersionVerboseRead(argumentsList: readonly string[]): boolean | undefined {
  const command = argumentsList[0]
  if (command !== "version" && command !== "--version" && command !== "-V") return undefined
  return argumentsList.slice(1).some((argument) => argument === "--verbose" || argument === "-v")
}
