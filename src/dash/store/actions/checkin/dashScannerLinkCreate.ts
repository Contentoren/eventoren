import { createResult, createResultError, type Result } from "#result"

import type { DashEntrance } from "../../../model/dashEntranceSchema.ts"
import type { DashScannerLink } from "../../../model/dashScannerLinkSchema.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

const tokenAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789"

function tokenCreate(): string {
  const bytes = new Uint8Array(24)
  const cryptoObject = (globalThis as { crypto?: { getRandomValues?: (bytes: Uint8Array) => void } }).crypto
  if (cryptoObject?.getRandomValues) cryptoObject.getRandomValues(bytes)
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)
  let token = ""
  for (const byte of bytes) token += tokenAlphabet.charAt(byte % tokenAlphabet.length)
  return token
}

export function dashScannerLinkCreate(
  args: { eventId: string; label: string; entrance: DashEntrance },
  store: DashStore = dashStoreGet(),
): Result<DashScannerLink> {
  const op = "dashScannerLinkCreate"
  const label = args.label.trim()
  if (label.length < 1 || label.length > 40) return createResultError(op, "Die Bezeichnung braucht 1 bis 40 Zeichen.")
  const event = store.state.events.find((entry) => entry.id === args.eventId)
  if (!event) return createResultError(op, "Das Event wurde nicht gefunden.")
  const link: DashScannerLink = {
    id: dashIdCreate("scanlink"),
    eventId: args.eventId,
    label,
    entrance: args.entrance,
    token: tokenCreate(),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
  }
  const updated = store.update(op, (draft) => {
    draft.scannerLinks.push(link)
  })
  if (!updated.success) return createResultError(op, "Der Scanner-Link konnte nicht gespeichert werden.")
  return createResult(link)
}
