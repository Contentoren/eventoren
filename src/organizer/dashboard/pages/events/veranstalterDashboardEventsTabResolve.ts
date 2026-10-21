export type VeranstalterDashboardEventsTab = "current" | "draft" | "past"

export type VeranstalterDashboardEventsTabQuery = {
  readonly status?: "draft" | "published" | "archived"
  readonly fromStartsAt?: string
  readonly toStartsAt?: string
  readonly sort: "startsAtAsc" | "startsAtDesc"
}

/**
 * Canonical tab mapping. `nowIso` is a UTC instant; the backend compares it
 * against stored UTC instants, so no Berlin conversion happens here.
 */
export function veranstalterDashboardEventsTabResolve(
  tab: VeranstalterDashboardEventsTab,
  nowIso: string,
): VeranstalterDashboardEventsTabQuery {
  if (tab === "draft") return { status: "draft", sort: "startsAtAsc" }
  if (tab === "past") return { toStartsAt: nowIso, sort: "startsAtDesc" }
  return { status: "published", fromStartsAt: nowIso, sort: "startsAtAsc" }
}
