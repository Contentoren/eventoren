export function adminMemberManagementText() {
  return {
    actionError: "Die Organizer-Rolle konnte nicht geändert werden.",
    empty: "Keine Mitglieder gefunden.",
    grant: "Organizer-Rolle vergeben",
    granted: "Organizer-Rolle wurde vergeben.",
    invitation: "Eingeladen am",
    loadError: "Die Mitglieder konnten nicht geladen werden.",
    loading: "Mitglieder werden geladen …",
    member: "Mitglied",
    organizer: "Organizer",
    description:
      "Suche Zitadel-Mitglieder und verwalte ihren Organizer-Zugriff. Änderungen werden erst nach erfolgreicher Synchronisierung angezeigt.",
    reload: "Erneut laden",
    revoke: "Organizer-Rolle entziehen",
    revoked: "Organizer-Rolle wurde entzogen.",
    role: "Rollen",
    roleFilter: "Rollen filtern",
    search: "Mitglieder suchen",
    searchHint: "Name, Benutzername oder E-Mail",
    searchSubmit: "Suchen",
    sessionRequired: "Für die Rollenverwaltung ist eine gültige Admin-Sitzung erforderlich.",
    title: "Mitglieder & Organizer-Rollen",
    total: "[X] Mitglieder",
    updating: "Wird gespeichert …",
    roleName: (role: string) => ({ admin: "Admin", customer: "Kunde", organizer: "Organizer" })[role] ?? role,
  }
}
