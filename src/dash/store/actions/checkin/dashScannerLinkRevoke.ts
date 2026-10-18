import { createResult, createResultError, type Result } from "#result"

import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export function dashScannerLinkRevoke(linkId: string, store: DashStore = dashStoreGet()): Result<void> {
  const op = "dashScannerLinkRevoke"
  const link = store.state.scannerLinks.find((entry) => entry.id === linkId)
  if (!link) return createResultError(op, "Der Scanner-Link wurde nicht gefunden.")
  if (link.revokedAt !== null) return createResultError(op, "Der Scanner-Link ist bereits gesperrt.")
  return store.update(op, (draft) => {
    const target = draft.scannerLinks.find((entry) => entry.id === linkId)
    if (!target) throw new Error("Der Scanner-Link wurde nicht gefunden.")
    target.revokedAt = new Date().toISOString()
  })
}
