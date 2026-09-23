# Globale Listen-/Kachelansicht

## Ziel

Im Profilmenü der gemeinsamen Admin-/Organizer-Shell neben der bestehenden Hell-/Dunkel-Einstellung eine globale Umschaltung zwischen „Liste“ und „Kacheln“ anbieten. Die Auswahl gilt für `/admin/mitglieder`, `/admin/events`, `/organizer` und `/admin/bestellungen` und bleibt nach einem Neuladen sowie über Tabs erhalten.

## Entscheidungen

- Eigenständige Ansichtspräferenz (nicht mit dem Farbschema verknüpft), gespeichert in `localStorage` unter einem eigenen versionierten Schlüssel.
- Standard ohne gespeicherte Präferenz: Liste. Keine Änderung an Such-/Filter-, Berechtigungs-, Lade-, Paginierungs- und Detailfunktionen.
- Nur die vier explizit genannten Routen anpassen; die Kundenseite „Meine Bestellungen“ bleibt unverändert.
- Bestehende `#ui/...`-Bausteine wiederverwenden; alle bisher sichtbaren Daten und Aktionen in beiden Modi zugänglich halten. Responsives Kachelraster, kompakte Listenzeilen.

## Aufgaben

1. [x] Globale, persistierte, tabübergreifend synchronisierte Ansichtspräferenz und zugängliche Umschaltung im Profilmenü der gemeinsamen Shell ergänzen.
2. [x] Mitglieder- und Admin-Eventseiten in beiden Ansichten rendern; bestehende Suche, Filter und Aktionen beibehalten.
3. [x] Organizer-Eventseite und Admin-Bestellungen in beiden Ansichten rendern; Gruppierung, Details und Paginierung beibehalten.
4. [x] Gezielte Tests/Typprüfung und abschließende Browserprüfung der vier Routen inklusive Persistenz durchführen.

## Kontext

- Profilmenü: `src/admin/AdminShell.tsx`; Organizer nutzt dieselbe Shell über `src/organizer/OrganizerShell.tsx`.
- Theme-Persistenz als Vorbild: `src/theme/`; Farbthema nicht verändern.
- Seiten: `src/admin/AdminMemberManagement.tsx`, `src/admin/AdminEventsListPage.tsx`, `src/organizer/OrganizerEventListPage.tsx`, `src/admin/AdminTicketOrdersPage.tsx`.
