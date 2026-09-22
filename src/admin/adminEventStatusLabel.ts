export function adminEventStatusLabel(status: unknown): string {
  if (status === "published") return "Veröffentlicht"
  if (status === "archived") return "Archiviert"
  return "Entwurf"
}
