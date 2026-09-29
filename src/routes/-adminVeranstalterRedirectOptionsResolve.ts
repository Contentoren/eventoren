export function adminVeranstalterRedirectOptionsResolve() {
  return { to: "/admin/mitglieder" as const, search: { memberRole: "organizer" as const } }
}
