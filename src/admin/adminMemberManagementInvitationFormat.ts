export function adminMemberManagementInvitationFormat(timestamp: string | undefined): string {
  if (!timestamp) return "—"
  const date = new Date(timestamp)
  if (Number.isNaN(date.valueOf())) return "—"
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(date)
}
