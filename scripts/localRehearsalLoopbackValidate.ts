import * as a from "valibot"
import { createResult, createResultError, type Result } from "#result"

const localRehearsalLoopbackInputSchema = a.pipe(a.string(), a.minLength(1, "Target URL is required"))

type LocalRehearsalLoopbackTarget = {
  readonly origin: string
  readonly hostname: string
  readonly port: number
}

const localRehearsalForbiddenPorts = new Set([3210, 3211, 3234, 3235, 6791, 8320, 8321])

export function localRehearsalLoopbackValidate(input: unknown): Result<LocalRehearsalLoopbackTarget> {
  const op = "localRehearsalLoopbackValidate"
  const parsed = a.safeParse(localRehearsalLoopbackInputSchema, input)
  if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
  let url: URL
  try {
    url = new URL(parsed.output)
  } catch {
    return createResultError(op, "Rehearsal target URL is not a valid URL")
  }
  if (url.protocol !== "http:")
    return createResultError(op, "Rehearsal target must use http (local loopback only, never https)")
  if (url.hostname !== "127.0.0.1")
    return createResultError(op, "Rehearsal target must be the literal loopback address 127.0.0.1")
  if (url.port === "") return createResultError(op, "Rehearsal target URL must include an explicit port")
  const port = Number(url.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    return createResultError(op, "Rehearsal target URL must include a valid port")
  if (localRehearsalForbiddenPorts.has(port))
    return createResultError(op, `Rehearsal target must not reuse a shared preview/production port (${port})`)
  if (url.username !== "" || url.password !== "")
    return createResultError(op, "Rehearsal target URL must not embed credentials")
  if (url.pathname !== "/" && url.pathname !== "")
    return createResultError(op, "Rehearsal target URL must not carry a path")
  if (url.search !== "" || url.hash !== "")
    return createResultError(op, "Rehearsal target URL must not carry query or fragment parts")
  return createResult({ origin: url.origin, hostname: url.hostname, port })
}
