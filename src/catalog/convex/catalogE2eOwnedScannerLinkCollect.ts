import type { Doc, Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { createResult, createResultError, type Result } from "#result"

export type CatalogE2eOwnedScannerLinks = {
  exclusive: Doc<"scannerLinks">[]
  prunes: { _id: Id<"scannerLinks">; eventKeys: string[] }[]
}

const scannerLinkTake = 101

/**
 * Collect scanner links that reference exactly the owned fixture event key so
 * no fixture reference is left behind. Links that exclusively reference the
 * fixture are deleted; links that also reference other events keep those and
 * drop only the fixture key. Shared links never lose foreign keys.
 */
export async function catalogE2eOwnedScannerLinkCollect(
  ctx: MutationCtx,
  ownedEventKey: string,
): Promise<Result<CatalogE2eOwnedScannerLinks>> {
  const op = "catalogE2eOwnedScannerLinkCollect"
  const links = await ctx.db.query("scannerLinks").take(scannerLinkTake)
  if (links.length >= scannerLinkTake)
    return createResultError(op, "Unbounded scanner links; retain for manual reconciliation")
  const exclusive: Doc<"scannerLinks">[] = []
  const prunes: CatalogE2eOwnedScannerLinks["prunes"] = []
  for (const link of links) {
    if (!link.eventKeys.includes(ownedEventKey)) continue
    if (link.eventKeys.length > 0 && link.eventKeys.every((key) => key === ownedEventKey)) {
      exclusive.push(link)
      continue
    }
    prunes.push({ _id: link._id, eventKeys: link.eventKeys.filter((key) => key !== ownedEventKey) })
  }
  return createResult({ exclusive, prunes })
}
