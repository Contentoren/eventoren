import * as v from "valibot"

export function adminTicketOrdersSearchParse(input: Record<string, unknown>): { event?: string; q?: string } {
  const event = v.safeParse(v.pipe(v.string(), v.nonEmpty()), input.event)
  const q = v.safeParse(v.pipe(v.string(), v.trim(), v.maxLength(100), v.nonEmpty()), input.q)
  return { event: event.success ? event.output : undefined, q: q.success ? q.output : undefined }
}
