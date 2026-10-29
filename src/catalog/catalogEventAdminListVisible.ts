import type { Doc } from "#convex/_generated/dataModel.js"

export function catalogEventAdminListVisible(
  event: Pick<Doc<"catalogEvents">, "status" | "deletedAt">,
  archiveOnly: boolean,
): boolean {
  if (archiveOnly) return event.status === "archived"
  return event.status !== "archived" && !event.deletedAt
}
