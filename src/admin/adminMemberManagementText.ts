import { language } from "../app/i18n/language.ts"
import { languageSignal } from "../app/i18n/languageSignal.ts"

export function adminMemberManagementText() {
  if (languageSignal.get() === language.de) {
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

  return {
    actionError: "The organizer role could not be changed.",
    empty: "No members found.",
    grant: "Grant organizer role",
    granted: "Organizer role granted.",
    invitation: "Invited at",
    loadError: "Members could not be loaded.",
    loading: "Loading members …",
    member: "Member",
    organizer: "Organizer",
    description:
      "Search Zitadel members and manage their organizer access. Changes appear only after successful synchronization.",
    reload: "Reload",
    revoke: "Revoke organizer role",
    revoked: "Organizer role revoked.",
    role: "Roles",
    search: "Search members",
    searchHint: "Name, username, or email",
    searchSubmit: "Search",
    sessionRequired: "A valid admin session is required to manage roles.",
    title: "Members & organizer roles",
    total: "[X] members",
    updating: "Saving …",
    roleName: (role: string) => ({ admin: "Admin", customer: "Customer", organizer: "Organizer" })[role] ?? role,
  }
}
