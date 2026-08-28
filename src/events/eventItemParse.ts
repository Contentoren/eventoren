import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { EventCategory } from "./EventCategory.ts"
import type { EventItem } from "./EventItem.ts"

const op = "eventItemParse"

const categories: readonly EventCategory[] = ["konzerte", "festivals", "kultur", "sport", "reisen"]

export function eventItemParse(input: unknown): Result<EventItem> {
  if (typeof input !== "object" || input === null) return createResultError(op, "Event ist kein Objekt.", input)

  const candidate = input as Partial<EventItem>
  if (typeof candidate.id !== "string" || candidate.id.length === 0)
    return createResultError(op, "Event benötigt eine id.", input)
  if (typeof candidate.title !== "string" || candidate.title.length === 0)
    return createResultError(op, "Event benötigt einen Titel.", input)
  if (typeof candidate.startsAt !== "string" || Number.isNaN(Date.parse(candidate.startsAt)))
    return createResultError(op, "Event benötigt ein gültiges Startdatum.", input)
  if (!categories.includes(candidate.category as EventCategory))
    return createResultError(op, "Event benötigt eine bekannte Kategorie.", input)
  if (!Array.isArray(candidate.tiers) || candidate.tiers.length === 0)
    return createResultError(op, "Event benötigt mindestens eine Ticketkategorie.", input)

  return createResult(candidate as EventItem)
}
