import * as v from "valibot"

export type AdminEventsSearch = {
  q?: string
  status?: "draft" | "published" | "archived"
  event?: string
}

export function adminEventsSearchParse(input: Record<string, unknown>): AdminEventsSearch {
  const status = input.status
  const event = v.safeParse(v.pipe(v.string(), v.nonEmpty()), input.event)
  return {
    q: typeof input.q === "string" && input.q.trim() ? input.q : undefined,
    status: status === "draft" || status === "published" || status === "archived" ? status : undefined,
    event: event.success ? event.output : undefined,
  }
}
