import { expect, test } from "bun:test"
import { adminMemberManagementText } from "../src/admin/adminMemberManagementText.ts"

test("admin member-management copy is German", () => {
  const text = adminMemberManagementText()

  expect(text).toMatchObject({
    actionError: "Die Rollen konnten nicht geändert werden.",
    cancel: "Abbrechen",
    dialogDescription: "Wähle die Projektrollen für dieses Mitglied. Änderungen werden direkt in Zitadel gespeichert.",
    dialogTitle: "Rollen bearbeiten",
    edit: "Rollen bearbeiten",
    empty: "Keine Mitglieder gefunden.",
    emptyRoles: "Mindestens eine Rolle ist erforderlich.",
    invitation: "Eingeladen am",
    lastAdminDenied: "Die letzte Admin-Rolle kann nicht entzogen werden.",
    loadError: "Die Mitglieder konnten nicht geladen werden.",
    loading: "Mitglieder werden geladen …",
    member: "Mitglied",
    description:
      "Suche Zitadel-Mitglieder und verwalte ihre Projektrollen. Änderungen werden direkt in Zitadel gespeichert und erst nach erfolgreicher Synchronisierung angezeigt.",
    reload: "Erneut laden",
    role: "Rollen",
    save: "Speichern",
    saved: "Rollen wurden gespeichert.",
    search: "Mitglieder suchen",
    searchHint: "Name, Benutzername oder E-Mail",
    searchSubmit: "Suchen",
    sessionRequired: "Für die Rollenverwaltung ist eine gültige Admin-Sitzung erforderlich.",
    title: "Mitglieder & Rollen",
    total: "[X] Mitglieder",
    updating: "Wird gespeichert …",
  })
  expect(text.roleName("admin")).toBe("Admin")
  expect(text.roleName("customer")).toBe("Kunde")
  expect(text.roleName("organizer")).toBe("Organizer")
  expect(text.roleName("user")).toBe("Benutzer")
})
