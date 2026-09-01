# 3 Test Dummy Events mit 3 Design-Variationen

## Goal
Beschränkung der Event-Liste und Detailseiten auf 3 Test-Dummy-Events sowie Erstellung von 3 unterschiedlichen Design-Variationen für die Event-Karten (und passend verlinkten Unterseiten), damit der Nutzer zwischen den Designs vergleichen und entscheiden kann.

## Decisions
- Datenbestand in `src/events/eventListMock.ts` auf 3 prägnante Test-Dummy-Events reduzieren (z. B. Festival, Reise/Kultur, Sport/Konzert).
- Die 3 Kacheln im Grid als 3 distincte Design-Variationen umsetzen:
  - **Variation A (Modern Editorial / Glass Overlay)**: Hero-Bild mit dynamischem Farbverlauf/Glassmorphism, prominenter Floating-Badge, schlichtem typografischem Footer & Ghost-/Outlined-CTA.
  - **Variation B (High-Impact Ticket / Bold Badge)**: Strukturierter Card-Look mit auffälligem Datums-Badge links, Ticket-Abrisskanten/Perforations-Optik bzw. starkem Kontrast und prominentem Primär-CTA.
  - **Variation C (Minimal Compact / Horizontal Focus)**: Eleganter, luftiger Look mit Fokus auf Location & Line-up/Info-Chips, sanftem Surface-Highlight und Schnellkauf-Aktion.
- Jede Karte mit einem visuellen Variation-Tag kennzeichnen (z. B. "Design 1: Editorial Glass", "Design 2: Bold Ticket", "Design 3: Clean Minimal") zur leichten Unterscheidung und Entscheidung.
- Sicherstellen, dass alle 3 Detail-Unterseiten (/events/...) für diese 3 Test-Events einwandfrei funktionieren.

## Approach
1. `src/events/eventListMock.ts` auf 3 Dummy-Events anpassen (mit Variation-Kennung oder spezifischen Datenfeldern).
2. `src/events/EventCard.tsx` bzw. Variation-Komponenten modularisieren, sodass im Grid jedes der 3 Events seine individuelle Design-Variante darstellt.
3. Visuelle und funktionale Überprüfung mittels Browser / Build & Tests.

## Tasks
- [x] Task 1: Reduziere `src/events/eventListMock.ts` auf 3 Test-Events und passe Filter/Kategorien an.
- [x] Task 2: Implementiere die 3 unterschiedlichen Card-Design-Variationen in `src/events/EventCard.tsx` (oder separate modulare Komponenten gemäß Code-Style).
- [x] Task 3: Verifiziere Build, Typings und visuelle Darstellung im Browser.
