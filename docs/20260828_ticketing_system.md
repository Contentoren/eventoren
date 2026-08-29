# Modernes Ticketing-System für Eventoren

## Goal
Umsetzung eines modernen, performanten Ticketing-Systems für Eventoren nach Best Practices (Discovery im Magazin-Look, transparenter Wallet-Kauf-Flow, mobile-first, Barrierefreiheit, einheitliche semantische Design-Tokens und exakte Abstände), ohne neue Bilder zu generieren (ausschließliche Verwendung des bestehenden Assets `/images/eventoren-og_9669cb2c.webp`).

## Decisions
- **Bounded Contexts**:
  - `src/events/` (Schemas, Mock-Daten, UI-Karten, Filter, Event-Detailansicht)
  - `src/ticketing/` (Ticket-Auswahl, Stepper, Warenkorb, Gast-Checkout, Wallet-Pass & QR-Ticket, Ticket-Verwaltung)
  - `src/ui/` (Wiederverwendbare Primitiven: Button, Badge, Stepper, Modal/Sheet, Container)
- **Code-Style Regeln**:
  - One export per file mit dateinamenkonformen Exports
  - Subject-first Namenskonventionen (`eventFindById.ts`, `ticketOrderCreate.ts`, `eventCardStateCreate.ts`, etc.)
  - View-only `.tsx` Komponenten mit ausgelagertem State (`<ComponentName>StateCreate.ts`)
  - `Result<T>` Typen statt Throws
- **Asset-Richtlinie**:
  - Keine neuen Bilder generieren. Ausschließliche Nutzung des vorhandenen Assets `/images/eventoren-og_9669cb2c.webp` als Platzhalter.
- **Design-System**:
  - Semantische Farb- und Abstandsregeln in `tailwind.css` / Utility-Klassen (konsistente Abstände wie 4, 6, 8, 12, 16, 24, 32px, 12-16px Border-Radius, Fokusringe, WCAG AA Kontraste).

## Approach
1. **Design-Tokens & UI Primitiven**: Semantische Farben, konsistente Badges, Buttons, Stepper und Layout-Container definieren.
2. **Events Context**: Event-Datenstrukturen, Schema, Mock-Repository und Event-Discovery-UI mit Schnellfiltern (Heute, Dieses Wochenende, Kategorien) und Event-Karten.
3. **Event-Detailseite & Ticketauswahl**: Rich-Detailansicht (`/events/$eventId`) mit Sticky-CTA, transparenter Gebührenaufschlüsselung und Mengenauswahl.
4. **Ticketing & Checkout Context**: 3-Schritt-Gast-Checkout (Auswahl/Kontakt -> Zahlung -> Bestätigung mit sofortigem digitalem Wallet-Ticket & QR-Code).
5. **Meine Tickets**: Übersicht `/meine-tickets` zum Abrufen und Anzeigen aller gekauften Tickets im Wallet-Pass-Format inklusive Offline-/Druckansicht.
6. **Routen & Navigation**: Integration in TanStack Start Router, Header-Navigation und SEO-Metadaten.
7. **Verifikation**: Typecheck, Build, Formatierung und Browser-Verifikation.

## Tasks
- [x] Task 1: UI Primitiven & Design-Tokens anlegen (`src/ui/`)
- [x] Task 2: Events Bounded Context implementieren (`src/events/`)
- [x] Task 3: Ticketing Bounded Context & Checkout implementieren (`src/ticketing/`)
- [x] Task 4: Routen erstellen & integrieren (`/`, `/events/$eventId`, `/checkout`, `/meine-tickets`)
- [x] Task 5: Typecheck, Build, Biome Format & Browser-Verifikation

## Paths
- `docs/20260828_ticketing_system.md`
- `src/ui/`
- `src/events/`
- `src/ticketing/`
- `src/routes/`
- `src/components/`
- `src/tailwind.css`
