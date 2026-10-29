import * as v from "valibot"

export type AdminEventsSearch = {
  q?: string
  status?: "draft" | "published" | "archived"
  event?: string
  showArchived?: boolean
  archive?: boolean
  overview?: string
}

export function adminEventsSearchParse(input: Record<string, unknown>): AdminEventsSearch {
  const status = input.status
  const event = v.safeParse(v.pipe(v.string(), v.nonEmpty()), input.event)
  const overview = v.safeParse(v.pipe(v.string(), v.nonEmpty()), input.overview)
  const archive = v.safeParse(
    v.boolean(),
    input.archive === "true" ? true : input.archive === "false" ? false : input.archive,
  )
  return {
    q: typeof input.q === "string" && input.q.trim() ? input.q : undefined,
    status: status === "draft" || status === "published" || status === "archived" ? status : undefined,
    event: event.success ? event.output : undefined,
    showArchived: input.showArchived === true || input.showArchived === "true" ? true : undefined,
    archive: archive.success ? archive.output : undefined,
    overview: overview.success ? overview.output : undefined,
  }
}
