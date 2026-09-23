import * as v from "valibot"

export function adminTicketOrdersSearchParse(input: Record<string, unknown>): { event?: string } {
  const event = v.safeParse(v.pipe(v.string(), v.nonEmpty()), input.event)
  return { event: event.success ? event.output : undefined }
}
