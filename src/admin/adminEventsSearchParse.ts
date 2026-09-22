export type AdminEventsSearch = {
  q?: string
  status?: "draft" | "published" | "archived"
}

export function adminEventsSearchParse(input: Record<string, unknown>): AdminEventsSearch {
  const status = input.status
  return {
    q: typeof input.q === "string" && input.q.trim() ? input.q : undefined,
    status: status === "draft" || status === "published" || status === "archived" ? status : undefined,
  }
}
