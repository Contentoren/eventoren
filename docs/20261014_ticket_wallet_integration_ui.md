# Apple & Google Ticket Wallet Integration UI

## Ziel
Nach dem Ticketkauf auf der Bestellbestätigungsseite (`/checkout`) sowie in der Bestellübersicht (`/bestellungen`) werden für jedes aktive Ticket offizielle Aktionen für **Apple Wallet** und **Google Wallet** angezeigt. Bei Klick öffnet sich ein Dialog mit Ticket- und Wallet-Details sowie dem Status der nativen Wallet-Bereitstellung.

## Entscheidungen und Umfang
- **Platzierung**: Direkt im Ticket-Block von `TicketOrderWalletPass.tsx` neben bzw. unter „Ticket drucken“.
- **Bedingte Sichtbarkeit (Env-Prüfung)**:
  - Wenn die Umgebungsvariablen/Konfiguration für Apple Wallet (`PUBLIC_APPLE_WALLET_PASS_TYPE_ID` oder `VITE_APPLE_WALLET_PASS_TYPE_ID`) bzw. Google Wallet (`PUBLIC_GOOGLE_WALLET_ISSUER_ID` oder `VITE_GOOGLE_WALLET_ISSUER_ID`) fehlen, werden die jeweiligen Buttons **ausgeblendet**.
  - Ebenfalls sichtbar, falls am Ticket direkt ein `appleWalletPassUrl` bzw. `googleWalletSaveUrl` hinterlegt ist.
- **Design & Richtlinien**:
  - Eigenständige, zugängliche Buttons nach Apple Wallet und Google Wallet Gestaltungsrichtlinien (schwarze Badges, offizielle Icons, gut lesbare Typografie).
  - Volle Barrierefreiheit (`aria-label`, Tastaturfokus, responsive Flex-Anordnung mit automatischem Zeilenumbruch).
  - Beim Drucken ausgeblendet (`print:hidden`).
- **Interaktion**:
  - Klick öffnet einen Dialog (`UiDialog`), der das Ticket (Code, Inhaber, Event) darstellt und über die native Wallet-Synchronisation informiert (inkl. Hinweis auf benötigte Backend-Zertifikate/Issuer-IDs).
  - Falls zukünftig ein direkter Pass-Download-Link / Google-Wallet-Save-URL am Ticket vorhanden ist, wird dieser direkt aufgerufen.
- **Architektur & Code-Style**:
  - Bounded Context `ticketing/` und `src/app/env/public/`.
  - One export per file, subject-first Funktionsnamen.
  - View-only TSX (`TicketWalletActions.tsx`, `TicketAppleWalletButton.tsx`, `TicketGoogleWalletButton.tsx`, `TicketWalletDialog.tsx`).
  - Komponenten aus `#ui/...` wiederverwenden (`UiDialog`, `UiButton`, `UiBadge` etc.).

## Aufgaben
1. **Wallet Buttons & Icons erstellen**: Komponenten `TicketAppleWalletButton.tsx` und `TicketGoogleWalletButton.tsx` mit sauberen SVG-Logos und barrierefreiem Styling umsetzen.
2. **Wallet Dialog & State erstellen**: `TicketWalletDialog.tsx` und `ticketWalletDialogStateCreate.ts` für die Pass-Vorschau und Backend-Status-Information implementieren.
3. **Integration in `TicketOrderWalletPass.tsx`**: Buttons pro aktivem Ticket einbinden und responsives Layout sicherstellen.
4. **Bedingte Sichtbarkeit via Env-Check**: `envAppleWalletEnabled.ts` und `envGoogleWalletEnabled.ts` erstellen, State-Accessors `isAppleWalletAvailable` und `isGoogleWalletAvailable` ergänzen, Buttons nur anzeigen wenn konfiguriert.
5. **Verifikation**: UI-Rendering, Env-Verhalten und fokussierte Tests ausführen.

## Status und aktueller Kontext
- Aufgaben 1-3: abgeschlossen. `TicketAppleWalletButton.tsx`, `TicketGoogleWalletButton.tsx`, `TicketWalletDialog.tsx` und Integration in `TicketOrderWalletPass.tsx` umgesetzt.
- Aufgabe 4: abgeschlossen. `envAppleWalletEnabled.ts` und `envGoogleWalletEnabled.ts` implementiert. Buttons sind standardmäßig ausgeblendet und werden nur gerendert, wenn die entsprechende Konfiguration (`PUBLIC_APPLE_WALLET_PASS_TYPE_ID` / `PUBLIC_GOOGLE_WALLET_ISSUER_ID` bzw. `PUBLIC_*_ENABLED` oder ein Pass-Link am Ticket) aktiv ist.
- Aufgabe 5: abgeschlossen. Browser-Verifikation bestätigt: Ohne gesetzte Env-Variablen sind Apple- und Google-Wallet-Buttons sauber ausgeblendet, „Ticket drucken“ bleibt verfügbar. Boundary-Check, Shared-UI-Check, TypeScript-Check und 34 Unit-Tests erfolgreich.
