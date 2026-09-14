import type { Result } from "../ui/Result.ts"
import type { TicketOrderAccessRecord } from "./TicketOrderAccessRecord.ts"
import { ticketOrderAccessStorageLoad } from "./ticketOrderAccessStorageLoad.ts"
import { ticketOrderAccessStorageSave } from "./ticketOrderAccessStorageSave.ts"

export function ticketOrderAccessStorageUpsert(record: TicketOrderAccessRecord): Result<null> {
  const loaded = ticketOrderAccessStorageLoad()
  if (!loaded.success) return loaded
  const next = [record, ...loaded.data.filter((candidate) => candidate.orderId !== record.orderId)]
  return ticketOrderAccessStorageSave(next)
}
