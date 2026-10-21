import * as va from "valibot"
import { apiKeyCreateInputSchema } from "../auth/model/apiKeyCreateInputSchema.js"
import { apiKeyRenameInputSchema } from "../auth/model/apiKeyRenameInputSchema.js"
import { apiKeyRevokeInputSchema } from "../auth/model/apiKeyRevokeInputSchema.js"
import { apiKeyRotateInputSchema } from "../auth/model/apiKeyRotateInputSchema.js"
import {
  apiClientApiKeyCreate,
  apiClientApiKeyList,
  apiClientApiKeyRename,
  apiClientApiKeyRevoke,
  apiClientApiKeyRotate,
  apiClientOrganizerEventList,
  apiClientTicketOrderListMine,
} from "../client/apiClient.js"

function flagRead(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}

function tokenResolve(args: readonly string[]): string | undefined {
  return flagRead(args, "token") ?? process.env["EVENTOREN_API_KEY"]
}

function outputWrite(result: unknown): number {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  return 0
}

function inputError(message: string): number {
  process.stderr.write(`error: ${message}\n`)
  return 1
}

export async function eventorenCliRun(argv: readonly string[]): Promise<number> {
  const [scope, action, ...rest] = argv
  if (scope === "keys" && action === "list") {
    const token = tokenResolve(rest)
    if (!token) return inputError("missing --token (or EVENTOREN_API_KEY)")
    return outputWrite(await apiClientApiKeyList(token))
  }
  if (scope === "keys" && action === "create") {
    const token = tokenResolve(rest)
    const name = flagRead(rest, "name")
    if (!token) return inputError("missing --token (or EVENTOREN_API_KEY)")
    if (!name) return inputError("missing --name")
    const parsed = va.safeParse(apiKeyCreateInputSchema, {
      token,
      name,
      ...(flagRead(rest, "expiry") === undefined ? {} : { expiryPreset: flagRead(rest, "expiry") }),
    })
    if (!parsed.success) return inputError(va.summarize(parsed.issues))
    return outputWrite(await apiClientApiKeyCreate(parsed.output))
  }
  if (scope === "keys" && action === "rename") {
    const token = tokenResolve(rest)
    const id = flagRead(rest, "id")
    const name = flagRead(rest, "name")
    if (!token) return inputError("missing --token (or EVENTOREN_API_KEY)")
    if (!id) return inputError("missing --id")
    if (!name) return inputError("missing --name")
    const parsed = va.safeParse(apiKeyRenameInputSchema, { token, id, name })
    if (!parsed.success) return inputError(va.summarize(parsed.issues))
    return outputWrite(await apiClientApiKeyRename(parsed.output))
  }
  if (scope === "keys" && action === "revoke") {
    const token = tokenResolve(rest)
    const id = flagRead(rest, "id")
    if (!token) return inputError("missing --token (or EVENTOREN_API_KEY)")
    if (!id) return inputError("missing --id")
    const parsed = va.safeParse(apiKeyRevokeInputSchema, { token, id })
    if (!parsed.success) return inputError(va.summarize(parsed.issues))
    return outputWrite(await apiClientApiKeyRevoke(parsed.output))
  }
  if (scope === "keys" && action === "rotate") {
    const token = tokenResolve(rest)
    const id = flagRead(rest, "id")
    if (!token) return inputError("missing --token (or EVENTOREN_API_KEY)")
    if (!id) return inputError("missing --id")
    const parsed = va.safeParse(apiKeyRotateInputSchema, { token, id })
    if (!parsed.success) return inputError(va.summarize(parsed.issues))
    return outputWrite(await apiClientApiKeyRotate(parsed.output))
  }
  if (scope === "organizer" && action === "events") {
    const token = tokenResolve(rest)
    if (!token) return inputError("missing --token (or EVENTOREN_API_KEY)")
    return outputWrite(await apiClientOrganizerEventList(token))
  }
  if (scope === "orders" && action === "mine") {
    const token = tokenResolve(rest)
    if (!token) return inputError("missing --token (or EVENTOREN_API_KEY)")
    return outputWrite(await apiClientTicketOrderListMine(token))
  }
  process.stdout.write(
    "Usage: eventoren <command>\n\n  keys list [--token T]\n  keys create --name N [--expiry P] [--token T]\n  keys rename --id ID --name N [--token T]\n  keys revoke --id ID [--token T]\n  keys rotate --id ID [--token T]\n  organizer events [--token T]\n  orders mine [--token T]\n  version [--verbose]\n\nToken defaults to EVENTOREN_API_KEY; accepts a session token or API key.\n",
  )
  return scope === undefined ? 0 : 1
}
