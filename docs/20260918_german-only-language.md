# Deutsch als einzige Sprache

## Ziel

Die öffentliche Eventoren-Oberfläche ist vollständig deutschsprachig. Englisch, Russisch und Tadschikisch werden nicht mehr als auswählbare oder automatisch verwendete Sprachen angeboten.

## Entscheidungen

- Deutsch (`de`) ist die einzige unterstützte UI-Sprache.
- Bestehende deutschsprachige Inhalte bleiben unverändert.
- Sprachumschalter, Sprachpersistenz und nicht-deutsche UI-Varianten werden entfernt oder auf Deutsch vereinheitlicht, ohne Domänen- oder Zahlungslogik zu verändern.

## Vorgehen

1. Sprachmodell, Initialisierung und sprachabhängige Komponenten erfassen sowie betroffene Tests bestimmen.
2. Die Anwendung auf Deutsch als einzige Sprache vereinheitlichen und nicht-deutsche Auswahlwege entfernen.
3. Sprachabhängige Navigation, Formulare, Status- und Hilfetexte auf verbleibende nicht-deutsche UI-Texte prüfen und korrigieren.
4. Typprüfung, relevante Tests, Build und Browser-Prüfung der öffentlichen Seiten ausführen.

## Status

- Task 1 abgeschlossen: Die UI-Sprachwahl erfolgt über das globale Sprachsignal; kein aktiver Sprachumschalter existiert. Nicht-deutsche Varianten betreffen Checkout, Bestellungen, Organizer, Verwaltung und Demo. Sprachwerte werden zudem in Domänenmodellen verwendet.
- Task 2 abgeschlossen: Laufzeit, Dokumentensprache sowie Header- und Demo-Navigation werden stets auf Deutsch aufgelöst; veraltete Browser- und Local-Storage-Werte fallen sicher auf Deutsch zurück.
- Task 3 abgeschlossen: Checkout, Bestell-/Walletansichten, Organizer, Verwaltung und Demo verwenden deutsche UI-Texte und deutsche UI-Formatierungen. Zugehörige Tests wurden angepasst.
- Task 4 abgeschlossen: Verbleibende englische Demo-Verzweigungen, Demo-Rechtsseiten und Metadaten wurden entfernt beziehungsweise deutschsprachig vereinheitlicht.
- Task 4 abgeschlossen: Öffentliche Test-Eventinhalte, Demo-Dokumenttitel, zugängliche Navigation sowie verbleibende Demo-Rechts- und Verwaltungsbegriffe sind deutschsprachig vereinheitlicht und im Browser geprüft.
- Aktueller Kontext: Deutsch ist die einzige UI-Laufzeitsprache; Domänen- und Dateisprache bleiben unverändert.
