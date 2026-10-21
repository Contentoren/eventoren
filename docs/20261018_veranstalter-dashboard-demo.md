# Veranstalter-Dashboard – interaktive Demo

Status: fertig und live auf https://eventoren.de/demo/dashboard (Commit `697bc5d`, Pages-Deployment `d4c6e0ba`, 19.10.2026).

## Ziel

- Eine klickbare, interaktive Demo unter `/demo/...` für das neue Veranstalter-Dashboard und die angrenzenden Seiten. Sie dient zum Ansehen, Testen und Weiterentwickeln.
- Die Demo ändert nur Oberfläche und Interaktion. Die Daten liegen lokal im Browser (Demodaten in localStorage). Convex und das Backend werden nicht angefasst, die Anbindung kommt später.
- Wichtigstes Kriterium ist UI/UX auf dem Niveau moderner SaaS-Dashboards (Stripe, Linear, Luma, pretix): intuitiv, wenig Text, Icons, und alle Teile greifen ineinander.
- Vorschau-URL ist der laufende Dev-Server mit HMR: https://eventoren.leonardomora.de/demo/dashboard (lokal: http://127.0.0.1:3057).

## Umfang

### Drin

- **Bereich je Veranstalter:**
  - Organisationen mit Org-Wechsler; alle Daten sind je Organisation getrennt.
  - Rollen je Organisation: Inhaber, Admin, Event-Manager, Finanzen, Einlass. Navigation und Aktionen richten sich nach der Rolle.
  - Scanner-Links für Aushilfen bleiben erhalten.
- **Onboarding in Eigenregie:** Konto → Organisation → Angaben (Impressum, Steuer, IBAN) → Veranstalter-AGB und AVV → erstes Event. Kein Stripe-Onboarding.
- **Öffentliches Veranstalterprofil:** Logo, Name, Untertitel, Beschreibung, Website, Kontakt, Social-Media-Links, Events und Anbieterangaben.
- **Dashboard:**
  - Übersicht mit Umsatz, Tickets, Auslastung und Verkaufskurve.
  - Events: per Assistent anlegen, bearbeiten, duplizieren, eigene Vorlagen speichern, Vorschau über die öffentliche Seite. FAQ und Ablauf sind selbst bearbeitbar, der Alt-Text ist Pflicht.
  - Bestellungen: Tickets erneut senden, Teilnehmer umschreiben, stornieren, teilweise erstatten, interne Notizen.
  - Exporte als CSV, Excel und PDF für Teilnehmer, Bestellungen und Check-ins.
  - Gästeliste und Freikarten mit eigenen Kontingenten.
  - Nachrichten an Ticketinhaber und eine automatische Erinnerung 24 h vorher (mit Anfahrt und Kalendereintrag).
  - Live-Einlass je Ticketart und Eingang, inklusive abgelehnter Scans.
  - Änderungsprotokoll.
- **Ticketing:**
  - Verkaufsphasen je Ticketart (Early Bird → Phase 1 → Phase 2) mit automatischem Wechsel.
  - Codes: Rabatt in % oder €, Zugangscodes mit Limit über mehrere Bestellungen, versteckte Ticketarten, Massen-Erstellung und -Bearbeitung.
  - Gutscheine, die nur beim jeweiligen Veranstalter gelten.
- **Finanzen:** Abrechnung je Event (Brutto, Gebühren, Zahlungskosten, Erstattungen, Rückbuchungen, Auszahlung). Ausgezahlt wird nach dem Event auf die IBAN des Veranstalters. Die Provisionsrechnung (Lexware) ist nur visuell.
- **Abendkasse:**
  - Der Veranstalter legt Abendkasse-Tickets mit Preis und Kontingent fest.
  - Der Kassenmodus zeigt einen QR-Code. Der Gast zahlt auf dem eigenen Handy (Apple/Google Pay, simuliert) und ist sofort eingecheckt.
  - Kein Bargeld.
- **Kleines Kundenkonto:** Tickets, Bestellungen mit Rechnung, Profil.
- **Admin, getrennt unter `/demo/admin/...`:**
  - Organisationen: freigeben, sperren, Gebührenmodell, Steuerstatus und Standardsatz.
  - Auszahlungen.

### Nicht drin

- SEO.
- Abschnitt 1 (Sicherheitsfix `organizerAuthorizeFn`); das passiert separat.
- Stripe Connect und das ZAG-Thema (später).
- Module freischalten, Pakete, Abos. Alles ist sichtbar.
- PostHog und Conversion-Kennzahlen.
- Zeitfenster und Terminserien, Zusatzfragen, Zusatzprodukte und Merch, Tisch- und Saalplan, Warteliste und Rückgabe, Ticket übertragen, Bundles, Gruppenrabatte, Spenden.
- Plattformweite Gutscheine.
- Farben, Shop-Branding, eigene Domain, Widget und iFrame.
- Tracking, Pixel, Promoter-Links, API und Webhooks.
- Express-Checkout, Wallet-Pässe, Barrierefreiheitsangaben, KI-Support.
- Offline-Scanner, mehrere Check-in-Listen, rotierender QR-Code.
- Bargeld und Tap to Pay.
- Abschnitt 7.
- Keine Änderung an Convex, am Verhalten produktiver Seiten oder an echten Daten.

## Entscheidungen

- **Sprache:** nur Deutsch, Ansprache mit „du“.
- **Steuern:** Der Admin setzt je Organisation den Steuerstatus (Regelbesteuerung oder Kleinunternehmer nach § 19 UStG) und den Standardsatz. Der Veranstalter wählt je Ticketart 19 % oder 7 %. Bei Kleinunternehmern wird keine USt ausgewiesen.
- **Gebühren:**
  - Der Admin setzt je Organisation Prozentsatz + Fixbetrag je Ticket und legt fest, wer zahlt (Käufer oder Veranstalter).
  - Der Veranstalter sieht das Gebührenmodell nur. Es ersetzt die Gebühr je Produkt.
- **Abendkasse:** QR-Code am Gast-Handy. Preis und Kontingent legt nur der Veranstalter fest.
- **Käuferseite = Vorschau:**
  - Profil, Eventseite, Kundenkonto und Abendkasse lesen die Dashboard-Daten.
  - Der bestehende Demo-Warenkorb und -Checkout bleiben unverändert und getrennt.
  - „Kaufen“ in der Eventseiten-Vorschau zeigt nur einen Toast.
- **Gästeliste und Freikarten:** drin.
- **Gutscheine – Laufzeit einstellbar:**
  - Standard je Organisation unter Einstellungen → Gutscheine.
  - Je Gutschein beim Erstellen wählbar und später änderbar: 1 Jahr · 2 Jahre · 3 Jahre zum Jahresende (Standard) · Unbegrenzt · Eigenes Datum.
- **AGENTS.md:** Der Eintrag „New features must be exposed by default via webui using Convex live query functions …“ war während der Arbeit entfernt und ist wiederhergestellt. Für diese Demo gilt: nur Oberfläche und lokaler Store, später austauschbar über Selektoren und Aktionen.
- **Änderungen an produktivem Code (alle rückwärtskompatibel):**
  - Optionale Props an `EventDetailPageView` (`description`, `faqs`, `schedule`, `organizerCard`, `notice`, `ticketsFooter`) und `EventDetailInfo` (D24).
  - Root-Footer im Vollbild und auf Demo-Unterseiten ausgeblendet (F1, F2).
  - `StatCard` und `statDeltaFormat` (neu von heute).
  - Neue Bausteine kommen nach `ui/`, den Demo-Rahmen ändert A1.
- **Auszahlung:** nach Eventende, ohne Rücklage, auf die IBAN des Veranstalters (kein Stripe Connect).
- **Admin-Seiten:** strikt getrennt vom Dashboard. Sie bekommen eigene Routen und zusätzliche Navigationseinträge in der bestehenden Admin-Demo.
- **Demo-Zustand:** liegt in localStorage und ist über Tabs hinweg synchron (Kassenmodus ↔ Gast-Handy ↔ Dashboard).
- **Globale Styles:** `src/tailwind.css` bleibt unverändert, damit produktive Seiten gleich aussehen. Dark-Mode-Farben für Status setzen die neuen Komponenten selbst mit `dark:`-Varianten (z. B. `dark:bg-emerald-950/40 dark:text-emerald-300`).
- **Arbeitsweise:**
  - Gearbeitet wird im Hauptordner auf `main`.
  - Subagenten committen nicht und führen keine git-Schreibbefehle aus (`add`, `commit`, `stash`, `checkout`, `restore`, `reset`, `clean`).
  - Nach Abschluss: Commits mit dem Skill `commits` (mehrere konventionelle Commits, Push), danach Deploy (E5, E6).
  - Die 14 nicht committeten API-Key-Dateien (`src/auth/convex/apiKey/*`, `src/auth/model/apiKey*`) werden nie angefasst und nicht mit committet.
- **Steuerung:**
  - Opus plant, legt für jede Seite Layout, Texte und Komponenten in diesem Plan fest und prüft jedes Ergebnis gegen die Spezifikation. Die Screenshots und die Checkliste dafür liefert ein Browser-Subagent.
  - Umgesetzt wird nur durch Subagenten mit Muse Spark 1.3 Contributor: Agent `muse-spark` für Code, `browser`/`explore` mit Modell `cliproxyapi/muse-spark-1.3-contributor`.
  - Unabhängige Aufgaben laufen parallel.

## Routen

**Dashboard** (Vollbild, eigene Shell, ohne SiteFrame):
- `/demo/dashboard`: Übersicht (`?zeitraum=7|30|365`)
- `/demo/dashboard/events`: Events (`?tab=aktuell|entwuerfe|vergangen|vorlagen`, `?q=`)
- `/demo/dashboard/events/neu`: Assistent (`?schritt=1|2|3`, `?vorlage=<id>`)
- `/demo/dashboard/events/<eventId>`: Event-Übersicht
- Event-Unterseiten unter `/demo/dashboard/events/<eventId>/`:
  - `details`
  - `tickets` (`?ticket=<id>|neu`)
  - `codes` (`?art=rabatt|zugang`, `?code=<id>|neu`, `?mehrere=1`)
  - `bestellungen` (`?bestellung=<id>`, `?q=`, `?status=`)
  - `teilnehmer`
  - `gaesteliste`
  - `einlass`
  - `abendkasse`
  - `nachrichten` (`?nachricht=<id>|neu`)
  - `abrechnung`
  - `protokoll` (`?bereich=`)
- `/demo/dashboard/bestellungen`: alle Events, mit Eventfilter
- `/demo/dashboard/gutscheine`, `/demo/dashboard/finanzen`, `/demo/dashboard/profil`, `/demo/dashboard/team`, `/demo/dashboard/einstellungen`
- `/demo/onboarding` (`?schritt=1..5`)
- `/demo/kasse/<eventId>`: Kassenmodus (Vollbild, Tablet am Eingang)
- `/demo/abendkasse/<eventId>`: Gast-Kaufseite (Vollbild, mobil)

**Öffentlich** (bestehender SiteFrame, unter `/demo/customer/`, damit sie in der Kunden-Gruppe des Verzeichnisses landen):
- `/demo/customer/veranstalter/<orgSlug>`: Veranstalterprofil (`?tab=kommende|vergangene`)
- `/demo/customer/veranstalter/<orgSlug>/<eventSlug>`: Event-Vorschau. Bei Entwurf oder „nicht gelistet“ erscheint ein Hinweisbanner.
- `/demo/customer/konto`: Kundenkonto (`?tab=tickets|bestellungen|profil`, `?ticket=<id>`, `?bestellung=<id>`)

**Admin** (bestehende Admin-Demo: SiteFrame + DemoAdminNav, neue Einträge „Organisationen“ und „Auszahlungen“):
- `/demo/admin/organisationen` (`?status=pruefung|aktiv|gesperrt`, `?q=`)
- `/demo/admin/organisationen/<orgId>`
- `/demo/admin/auszahlungen` (`?status=bereit|ausgezahlt|alle`)

**Intern** (nicht im Demo-Verzeichnis):
- `/demo/ui-kit-basis`, `/demo/ui-kit-eingaben`, `/demo/ui-kit-overlays`, `/demo/ui-kit-menues`, `/demo/ui-kit-diagramme`, `/demo/ui-kit-tabelle`, `/demo/ui-kit-dash`: Galerien der neuen Bausteine. Die Seiten-Komponenten liegen in `src/dash/gallery/`.

Regeln für IDs und Pfade:
- IDs und Slugs in Pfaden bestehen nur aus Kleinbuchstaben, Ziffern und Bindestrich (Regex von `demoScenarioSchema`).
- Neue Events bekommen die ID `ev-<6 Zeichen>`.

## Architektur

### Ordner

Alles Neue liegt im neuen Bounded Context `src/dash/`.
- `src/dash/model/`:
  - valibot-Schemas mit abgeleiteten Typen.
  - Reine Funktionen: Gebühren, Steuern, Phasen, Abrechnung, Kennzahlen, Codes und Markdown.
  - Keine Abhängigkeit zu Solid oder zum DOM. Tests als `*.test.ts` direkt daneben.
- `src/dash/store/`:
  - Die Demo-Datenquelle mit Zustand, Persistenz, Seed, Selektoren und Aktionen (eine Datei je Aktion, z. B. `dashOrderRefund.ts`).
  - Die UI greift nur über Selektoren und Aktionen auf Daten zu. So lässt sich der Store später durch Convex ersetzen.
- `src/dash/export/`: CSV, XLSX, PDF, ICS und der Download-Helfer.
- `src/dash/ui/`: Dashboard-Bausteine mit Domänenbezug, z. B. Shell, Sidebar, Org- und Event-Wechsler, Statusbadges, PageHeader und Wasserfall.
- `src/dash/pages/<bereich>/`: je Seite `DashXyzPage.tsx` (nur JSX) und `dashXyzPageStateCreate.ts`.
- `src/dash/public/`: Veranstalterprofil, Event-Vorschau und Gast-Kaufseite der Abendkasse.
- `src/dash/account/`: Kundenkonto.
- `src/dash/admin/`: Admin-Seiten. Sie dürfen `model`, `store` und `ui` importieren. Außerhalb von `admin/` importiert nichts aus `admin/`.
- Generische Bausteine ohne Domänenbezug (Sheet, Charts, DataTable, Switch, …) kommen nach `ui/` und werden über `#ui/...` importiert.
- Routen in `src/routes/demo/` bleiben dünn:
  - `createFileRoute`, Validierung der Search-Params mit valibot und die Seitenkomponente.
  - Die Namen folgen den bestehenden Konventionen (`admin_.xyz.tsx` für Admin-Seiten ohne Verschachtelung).

### Demo-Rahmen

- `DemoRouteShell` (`src/demo/ui/DemoRouteShell.tsx` + `src/demo/state/demoRouteShellStateCreate.ts`):
  - Bekommt `isFullscreen()` für Pfade, die mit `/demo/dashboard`, `/demo/onboarding`, `/demo/kasse` oder `/demo/abendkasse` beginnen.
  - Im Vollbild wird nur `<Outlet />` gerendert, weiterhin innerhalb von `DemoFlowProvider`, also ohne SiteFrame und DemoControls.
- `<Toaster />` (`#ui/interactive/toast/Toaster.jsx`) wird einmal in `DemoRouteShell` für alle Demo-Seiten eingebunden.
- `demoFlowRouteCapabilityResolve`: Alle neuen Pfadpräfixe werden statisch (keine Flow-Zustände). Die Tests werden entsprechend ergänzt.
- Kein `ssr: false`: Der Cloudflare-SSR-Worker und die SSR-Checks erwarten serverseitig gerenderte Routen.
  - Seiten mit localStorage-Zustand rendern ihren Inhalt in `ClientOnly` (`@tanstack/solid-router`) mit Skeleton-Fallback. Der Server liefert Kopf und Skeleton, so gibt es keine Hydration-Mismatches.
  - Das Dashboard-Layout (`dashboard.tsx`) umschließt Shell und `<Outlet />` mit `ClientOnly`. Fallback ist `DashShellSkeleton`.
  - Galerien ohne Store rendern normal per SSR.
- Das Demo-Verzeichnis (`/demo`) bekommt:
  - eine neue Gruppe „Veranstalter-Plattform“ für `/demo/dashboard*`, `/demo/onboarding`, `/demo/kasse*` und `/demo/abendkasse*`,
  - einen Schnelleinstieg „Veranstalter-Dashboard“.
- Die Admin- und Kunden-Einträge landen über ihre Pfade automatisch in den bestehenden Gruppen.

### Store

- Ein Singleton auf Basis von `createStore` aus `solid-js/store`. Er wird erst auf dem Client angelegt. Vorher prüfen, ob `ui/utils/createLocalStore.ts` passt.
- Der gesamte Zustand ist ein Objekt `DashState` und wird mit `dashStateSchema` validiert.
- Persistenz:
  - localStorage-Schlüssel `eventoren-demo-plattform-v1`.
  - Schreiben entprellt (400 ms) über `requestIdleCallback`.
  - Beim Lesen mit valibot validieren. Ist der Inhalt ungültig, wird neu geseedet.
- Synchronisation zwischen Tabs: Ein `storage`-Event wird validiert und per `reconcile` übernommen. Das braucht der Ablauf Kassenmodus ↔ Gast-Handy und Admin ↔ Dashboard.
- Mutationen laufen über `dashStoreUpdate(op, (draft) => …)` (mit `produce`). Aktionen geben `Result<T>` zurück und schreiben bei relevanten Änderungen einen `DashAuditEntry`.
- Zeitbezug:
  - Der Seed hängt am Zeitpunkt des ersten Ladens (`seededAt`, dazu `seedDay` als Berliner Datum); alle Eventdaten sind relativ dazu.
  - Ist `seedDay` beim Laden nicht mehr heute (Berlin), werden alle Zeitpunkte im Zustand um die Differenz in Kalendertagen verschoben, und zwar über die Berliner Uhrzeit (`…FromIso` → Tage addieren → `…ToIso`). Eigene Änderungen bleiben dabei erhalten.
  - „Demo zurücksetzen“ seedet neu.
  - „Leeres Konto“ seedet ebenfalls neu, meldet aber eine neue Nutzerin `user-neu` ohne Name, E-Mail und Mitgliedschaft an (`activeOrgId: null`). So startet das Onboarding, während Admin- und Käuferseiten befüllt bleiben.
  - `dashNow()` ist ein Signal, das alle 30 s tickt. Alle reinen Funktionen bekommen `now` als Parameter.
- Sitzung:
  - `session.userId`, `session.activeOrgId`, `session.simulatedRole` (Demo-Schalter „Rolle simulieren“).
  - Die wirksame Rolle ist `simulatedRole ?? membership.role`.

### Code-Regeln (für alle Aufgaben)

- Die Skill-Regeln `code-style` gelten:
  - eine Datei je Export, Namen nach dem Muster Subjekt → Verb (`dashOrderRefund`),
  - `.tsx` nur mit JSX plus einem einzigen Aufruf von `xyzStateCreate(...)`,
  - `createSignalObject` (`#ui/utils/createSignalObject.js`), `Result` aus `#result`,
  - `import * as v from "valibot"`, frühe Returns.
- Das Literal `<button` ist in `src/**` verboten (`shared-ui:check`). Stattdessen `Button`, `ButtonIcon`, `ButtonIconOnly` oder `LinkButtonInternal` aus `#ui/...`.
- Biome: Leerzeichen, Zeilenbreite 120, doppelte Anführungszeichen, Semikolons nur wo nötig, Trailing Commas.
- Zeit:
  - Anzeige immer in `Europe/Berlin` über `src/events/eventDateFormat*.ts` und `eventTimeFormat.ts`.
  - `datetime-local` ↔ ISO über `src/admin/adminEventReleaseDateTimeFromIso.ts` und `…ToIso.ts`.
  - Gespeichert wird UTC-ISO.
- Geld:
  - Beträge immer als ganze Cent.
  - Anzeige über `src/events/eventPriceFormat.ts`, Eingabe über `src/admin/adminEuroToCents.ts`.
  - Prozentwerte in Basispunkten (350 = 3,5 %).
- URL-Zustand:
  - Tabs, offene Sheets und Dialoge, Filter und Suche stehen in Search-Params.
  - Suche über `history.replaceState`, entprellt.
- Icons: MDI über `import { mdiX } from "@adaptive-ds/mdi/mdiX.js"` und `<Icon path={mdiX} class="size-4" />`.
- Importe: Innerhalb von `src/` geht beides, relativ oder als Alias `#src/...`. Beim Bearbeiten den Stil der Datei beibehalten. Für Bausteine aus `ui/` immer `#ui/...` verwenden.
- Keine neuen npm-Pakete:
  - `jspdf` gibt es schon (nur lazy per `await import("jspdf")`).
  - CSV, XLSX, Charts und QR werden selbst gebaut. Für QR gibt es `src/ticketing/TicketQrCode.tsx` bzw. `ticketQrSvgGenerate`.
- Nicht anfassen:
  - `convex/**` und `src/**/convex/**`,
  - die nicht committeten Dateien `src/auth/convex/apiKey/*` und `src/auth/model/apiKey*`,
  - produktive Seiten. Einzige Ausnahme sind optionale, rückwärtskompatible Props in `EventDetailPageView` und `EventDetailInfo` (siehe P21).
- Bilder:
  - Event-Fotos über `urlImage(imageList.i1920x1080_webp_<name>)` aus `src/app/assets/`.
  - Logos sind Initialen-Avatare oder ein hochgeladenes Bild (auf max. 512 px verkleinert und als Data-URL gespeichert).

### Prüfen (für alle Aufgaben)

- Der Dev-Server läuft schon: systemd `eventoren.service`, http://127.0.0.1:3057, mit HMR. Er ist öffentlich erreichbar unter https://eventoren.leonardomora.de. Keinen zweiten Server starten. Den Dienst nicht selbst neu starten, weil andere Subagenten parallel prüfen; nur wenn er länger als 2 Minuten nicht `active` ist, einmal `systemctl --user restart eventoren.service`.
- Typen:
  - Da parallel gearbeitet wird, zählen nur Fehler in den eigenen Dateien: `bunx tsc --noEmit -p . 2>&1 | grep 'error TS' | grep -E '<Regex der eigenen Pfade>'` muss leer sein.
  - Die 52 bekannten Fehler in `src/auth/(convex/apiKey|model/apiKey)` werden ignoriert.
- Formatieren: `bunx biome format --write <eigene Dateien>`.
- `bun run shared-ui:check`.
- Tests:
  - Nur gezielt: `bun test <eigene *.test.ts>`.
  - Wer `src/demo/model` ändert, zusätzlich `bun test test/demo`.
  - Niemals `test:e2e*`, `bun run check` oder `bun run build`.
- Sichtprüfung:
  - Browser-Prüfungen laufen immer über die `agent-browser`-CLI in der Shell (`/home/leo/.bun/bin/agent-browser --session <name> …`), nicht über ein Desktop-Browser-Tool.
  - agent-browser: Timeout über die Umgebungsvariable `AGENT_BROWSER_DEFAULT_TIMEOUT=30000` setzen, denn `open` kennt kein `--timeout`. Den Viewport mit `set viewport W H` setzen, für jede Prüfung eine eigene benannte Session verwenden. Nie Dateien wie `--width` oder `--viewport` im Repo erzeugen. Arbeitsordner für Artefakte ist `/tmp/opencode/`.
  - Native Datumsfelder zeigen das Format der Browser-Sprache. Das US-Format im Headless-Browser ist ein Artefakt; deutsche Browser zeigen TT.MM.JJJJ.
  - `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3057/<pfad>` ergibt 200.
  - Screenshots macht ein `browser`-Subagent: 1440×900 und 390×844, gespeichert in `/tmp/opencode/eventoren-dash/<aufgabe>-*.png`. Die Konsole muss ohne Fehler sein.
- Verschachtelte Overlays:
  - Ein Dialog, der aus einem Sheet geöffnet wird, muss als JSX-Kind im Inhalt des Sheets gerendert werden. Dann erkennt corvu ihn als verschachtelt: Esc schließt nur die oberste Ebene, und Klicks darin schließen das Sheet nicht.
  - Dazu `nested` setzen (`ModalDialog`, `ConfirmDialog`), das gibt ein helleres Overlay und einen höheren z-Index.
  - Für Formulare in Dialogen wird `ModalDialog` (`#ui/interactive/dialog/ModalDialog.jsx`) verwendet.
- Gesteuerte Dialoge (`open` aus der URL): Corvus `onOpenChange(true)` feuert nicht, wenn `open` von außen gesetzt wird. Formulare deshalb mit `createEffect(on([open, id], …))` vorbelegen, nicht in `onOpenChange`.
- Hydration:
  - IDs mit `createUniqueId()`, nie `Math.random()` beim Rendern.
  - `ButtonIconOnly` ohne Kinder verwenden (nur `aria-label` und `title`).
  - Zufall oder Uhrzeit, die die Ausgabe beeinflussen, nur im `ClientOnly`-Bereich.
- SSR-Sicherheit: `onCleanup` nur innerhalb von `onMount` und nur auf dem Client registrieren. Kein Zugriff auf `window`, `document` oder `localStorage` auf Modulebene oder beim Rendern auf dem Server. Ein SSR-Fehler bringt den Dev-Server in eine Neustart-Schleife. Nach jeder Änderung prüfen: `systemctl --user is-active eventoren.service` ergibt `active`.
- Kein Commit und keine git-Schreibbefehle.
- Zu Beginn und am Ende `date +%T` ausführen und beide Zeiten berichten.
- Bericht: geänderte und neue Dateien, Entscheidungen, offene Punkte, Prüfstatus mit Befehlen.

## Datenmodell (`src/dash/model/`, valibot)

Für alle Entitäten gilt:
- Jede Entität hat `id: string`; Zeitpunkte sind UTC-ISO-Strings, Geldbeträge ganze Cent.
- `DashState = { version: 1, seededAt, session, users, orgs, members, events, ticketTypes, codes, vouchers, orders, tickets, guestQuotas, guests, scans, scannerLinks, messages, templates, payouts, boxOfficeSales, audit }`. Alle Sammlungen sind Arrays.

Entitäten:
- `DashSession`: `{ userId, activeOrgId: string | null, simulatedRole: DashRole | null }`
- `DashUser`: `{ id, name, email }`
- `DashOrg`:
  - Stammdaten: `{ id, slug, name, kind: "verein"|"unternehmen"|"schule"|"privat", subtitle, description (Markdown-Subset), logoDataUrl: string|null }`
  - Kontakt: `{ website, email, phone, socials: { instagram, facebook, tiktok, youtube, x, linkedin } }` (Felder als `string`, leer = nicht gesetzt)
  - Impressum: `{ imprint: { legalName, street, zip, city, representative, register, vatId } }`
  - Bank: `{ bank: { holder, iban } }`
  - Steuer: `{ tax: { status: "regel"|"klein", defaultRateBps: 1900|700 } }`
  - Gebühr: `{ fee: { percentBps, fixedCents, payer: "kaeufer"|"veranstalter" } }`
  - Status: `{ status: "pruefung"|"aktiv"|"gesperrt", statusReason, termsAcceptedAt, dpaAcceptedAt, createdAt }`
  - Gutscheine: `{ voucherDefaultValidity: "1-jahr"|"2-jahre"|"3-jahre-jahresende"|"unbegrenzt" }` (Standard `3-jahre-jahresende`)
- `DashMember`: `{ id, orgId, userId: string|null, name, email, role: "inhaber"|"admin"|"eventmanager"|"finanzen"|"einlass", status: "aktiv"|"eingeladen", invitedAt }`
- `DashEvent`:
  - Inhalt: `{ id, orgId, slug, title, subtitle, category: "konzert"|"party"|"abiball"|"kurs"|"kultur"|"sport"|"festival"|"sonstiges", startsAt, endsAt, doorsAt }`
  - Ort: `{ venue: { name, street, zip, city } }`
  - Medien und Texte: `{ imageUrl, imageAlt, description, faq: {id, question, answer}[], schedule: {id, time "HH:mm", title, detail}[] }`
  - Status: `{ status: "entwurf"|"veroeffentlicht"|"abgesagt", visibility: "oeffentlich"|"nicht-gelistet", salesPaused, cancelReason }`
  - Abendkasse: `{ boxOffice: { enabled, opensAt } }`
  - Erinnerung: `{ reminder: { enabled, hoursBefore: 24, directions, calendar, sentAt } }`
  - Zeitstempel: `{ createdAt, updatedAt, publishedAt }`
- `DashTicketType`:
  - Grunddaten: `{ id, eventId, name, description, channel: "online"|"abendkasse", hidden (nur per Zugangscode), capacity, maxPerOrder, taxRateBps: 1900|700, sortOrder, archivedAt: string|null }`
  - Verkaufszeitraum: `{ salesStartAt|null, salesEndAt|null }` (null bedeutet sofort bzw. bis Eventbeginn)
  - Phasen: `{ phases: DashPricePhase[] }` (mindestens 1)
- `DashPricePhase`: `{ id, name, priceCents, endsAt: string|null, quota: number|null }`
  - Die Reihenfolge im Array ist die Phasenfolge.
  - Eine Phase endet bei `endsAt` oder sobald `quota` Tickets dieser Phase verkauft sind, je nachdem, was zuerst eintritt. Danach gilt automatisch die nächste Phase.
  - Ist die letzte Phase zu Ende, ist die Ticketart nicht mehr verfügbar.
- `DashCode`:
  - `{ id, eventId, kind: "rabatt"|"zugang", code (Großbuchstaben, A–Z 0–9 -), ticketTypeIds: string[] (leer = alle), maxTickets: number|null, usedTickets, validFrom|null, validUntil|null, active, note, createdAt }`
  - Nur für Rabattcodes: `discount: { type: "prozent"|"betrag", value }` (Prozent in bps, Betrag in Cent je Ticket).
  - Zugangscodes schalten versteckte Ticketarten aus `ticketTypeIds` frei.
- `DashVoucher`:
  - `{ id, orgId, code, initialCents, balanceCents, kind: "verkauft"|"kostenlos", recipientName, recipientEmail, message, validity: "1-jahr"|"2-jahre"|"3-jahre-jahresende"|"unbegrenzt"|"datum", expiresAt: string|null (null = unbegrenzt), status: "aktiv"|"eingeloest"|"abgelaufen"|"deaktiviert", createdAt, redemptions: {orderId, amountCents, at}[] }`
  - Ein Gutschein gilt nur bei seiner Organisation.
- `DashOrder`:
  - Kopf: `{ id, number "EV-260123", orgId, eventId, channel: "online"|"abendkasse"|"gaesteliste", createdAt }`
  - Käufer und Status: `{ buyer: {firstName, lastName, email}, status: "bezahlt"|"offen"|"storniert"|"erstattet"|"teilerstattet" }`
  - Zahlung: `{ payment: { method: "karte"|"paypal"|"sepa"|"applepay"|"googlepay"|"gutschein"|"kostenlos", costCents } }`
  - Positionen: `{ lines: {ticketTypeId, phaseId, name, unitPriceCents, quantity, taxRateBps}[] }`
  - Abzüge: `{ discount: {codeId, code, amountCents}|null, voucher: {voucherId, code, amountCents}|null }`
  - Summen: `{ serviceFeeCents (vom Käufer bezahlt), totalCents (vom Käufer bezahlt) }`
  - Nachgang: `{ refunds: {id, amountCents, reason, at, ticketIds}[], chargeback: {amountCents, feeCents, at}|null }`
  - Verlauf: `{ notes: {id, text, author, at}[], emails: {at, to, kind}[], invoiceNumber }`
- `DashTicket`: `{ id, orderId, eventId, ticketTypeId, code "T-XXXX-XXXX", holderName, holderEmail, status: "gueltig"|"storniert", checkedInAt|null, entrance|null }`
- `DashGuestQuota`: `{ id, eventId, name, limit }`
- `DashGuest`:
  - `{ id, eventId, quotaId|null, name, email, plusOnes 0–5, note, ticketId|null, checkedInAt|null, createdAt }`
  - „Ticket senden“ erzeugt ein Gratis-Ticket über eine Gästelisten-Bestellung (`channel: "gaesteliste"`).
- `DashScan`: `{ id, eventId, at, entrance: "Haupteingang"|"Seiteneingang"|"Abendkasse", device, ticketId|null, code, result: "ok"|"doppelt"|"falsches-event"|"unbekannt"|"storniert" }`
- `DashScannerLink`: `{ id, eventId, label, entrance, token, createdAt, lastUsedAt|null, revokedAt|null }`
- `DashMessage`:
  - `{ id, eventId, kind: "info"|"aenderung"|"absage"|"erinnerung", audience: { type: "alle"|"ticketarten"|"eingecheckt"|"nicht-eingecheckt", ticketTypeIds } }`
  - `{ subject, body, status: "entwurf"|"geplant"|"gesendet", scheduledAt|null, sentAt|null, recipientCount, openRateBps|null }`
- `DashTemplate`:
  - `{ id, orgId, name, createdAt, sourceEventId, durationMinutes, event: {title, subtitle, category, venue, description, faq, schedule, imageUrl, imageAlt, reminder}, ticketTypes: [...] }`
  - Phasen- und Verkaufsdaten sind als Minuten-Offset relativ zum Eventbeginn gespeichert.
- `DashPayout`: `{ id, orgId, eventId, amountCents, status: "geplant"|"bereit"|"ausgezahlt", dueAt (Eventende + 3 Tage), paidAt|null, reference }`
- `DashBoxOfficeSale`:
  - `{ id, eventId, lines: {ticketTypeId, quantity, unitPriceCents}[], totalCents, status: "wartet"|"bezahlt"|"abgebrochen", createdAt, paidAt|null, orderId|null, buyerEmail|null }`
  - Das ist ein offener Kassenvorgang. Der Kassenmodus legt ihn an, die Gast-Kaufseite bezahlt ihn.
- `DashAuditEntry`: `{ id, orgId, eventId|null, at, actor, area: "event"|"tickets"|"codes"|"bestellungen"|"gaesteliste"|"nachrichten"|"einlass"|"abendkasse"|"profil"|"team"|"einstellungen"|"admin", action, before, after }` (Texte auf Deutsch)

Reine Funktionen (jede in eigener Datei, mit Tests):
- `dashFeeCompute({ priceCents, fee })` → `{ feeCents, buyerPaysCents, organizerGetsCents }`:
  - `fee = round(price · percentBps / 10000) + fixedCents`.
  - Gratis-Tickets kosten keine Gebühr.
  - Zahlt der Veranstalter, gilt `buyerPays = price` und `organizerGets = price − fee`.
- `dashTaxCompute({ grossCents, rateBps, status })` → `{ netCents, taxCents }`. Bei Kleinunternehmern ist `tax = 0`.
- `dashPhaseResolve(ticketType, soldByPhase, now)` → `{ phase | null, index, state: "geplant"|"aktiv"|"ausverkauft"|"beendet", nextPhase, endsReason }`.
- `dashTicketTypeAvailability(...)` → `{ sold, reserved: 0, available, capacity }`.
- `dashEventPhaseGet(event, stats, now)` → `"entwurf"|"im-verkauf"|"pausiert"|"ausverkauft"|"live"|"beendet"|"abgesagt"`.
- `dashSettlementCompute({ event, ticketTypes, orders, tickets, org })`:
  - **Einbezogen** sind Bestellungen mit Status bezahlt, teilerstattet, erstattet oder storniert. Offene Bestellungen stehen nur als Info unter `openOrders`.
  - **Beträge:**
    - `ticketRevenueCents` = Σ (Positionen − Rabatt).
    - `refundsCents` = Σ (Erstattung − erstattete Servicegebühr).
    - `refundedFeesCents`: trägt Eventoren.
    - `chargebacksCents` = Betrag + Gebühr.
    - `platformFeeCents`: nur wenn der Veranstalter zahlt (je Ticket über `dashFeeCompute`).
    - `paymentCostsCents`, `buyerFeesCents`, `voucherPaidCents`: Info.
  - **Aufschlüsselung:**
    - `taxByRate` und `byTicketType`: Rabatt und Ticket-Erstattungen anteilig auf die Positionen verteilt. Die Summe ist `ticketRevenue − refunds`.
    - `byPaymentMethod`.
  - **Ergebnis:** `payoutCents = ticketRevenue − refunds − chargebacks − platformFee − paymentCosts`.
- `DashRefund` bekommt `feeCents` (erstattete Servicegebühr, Standard 0).
- Regeln für Bestellsummen (für Seed und Aktionen):
  - `totalCents = Σ(unitPrice × qty) − discount + serviceFeeCents`.
  - Ein Gutschein bezahlt `voucher.amountCents ≤ totalCents`, den Rest bezahlt die Zahlart. Deckt der Gutschein alles, ist die Zahlart `gutschein`; bei 0 € ist sie `kostenlos`.
  - Zugangscodes werden in `discount` mit `amountCents: 0` gespeichert, damit ihre Nutzung zählt.
  - `storniert` und `erstattet` bedeuten: Alle Tickets sind `storniert`, und es gibt eine Erstattung über `totalCents` mit `feeCents = serviceFeeCents`.
  - `teilerstattet`: einzelne Tickets storniert, Erstattung ohne Gebühranteil.
  - Zahlungskosten (Info) über `dashPaymentCostCompute(method, amountCents)`:
    - Karte, Apple Pay, Google Pay: 1,5 % + 0,25 €
    - PayPal: 2,49 % + 0,35 €
    - SEPA: 0,35 €
    - Gutschein, kostenlos: 0
- Kennzahlen zählen keine Bestellungen der Gästeliste als Verkauf. Umsatz = Positionen − Rabatt − Ticket-Erstattungen, ohne stornierte oder erstattete Bestellungen.
- `dashOrgStats(state, orgId, range, now)` → `{ revenueCents, tickets, orders, avgOrderCents, occupancyBps, deltas, series: {date, revenueCents, tickets}[] }` (Tagesbuckets in Europe/Berlin).
- `dashEventStats(state, eventId, now)` → `{ byTicketType, byChannel, salesCurve, checkIns }`.
- `dashCodeGenerate(prefix, count, rng)`.
- `dashCodeValidate(code, cart)`.
- `dashVoucherExpiry(createdAt, validity, customDate: string|null)` → `string|null`:
  - `1-jahr` bzw. `2-jahre`: gleiches Datum im Folgejahr bzw. übernächsten Jahr, 23:59 Berlin.
  - `3-jahre-jahresende`: 31.12. des dritten Folgejahres, 23:59 Berlin.
  - `unbegrenzt`: `null`.
  - `datum`: `customDate`, 23:59 Berlin.
- `dashIbanValidate(iban)` (mod 97).
- `dashSlugCreate(text)` (äöüß → ae oe ue ss).
- `dashMarkdownParse(text)` → Blöcke `paragraph|heading|list` mit Inline-Elementen `text|bold|italic|link`. Ohne HTML und ohne innerHTML. Gerendert wird mit `DashMarkdown.tsx`.
- `dashRolePermissions(role)` → `Set<DashPermission>` mit den Rechten:
  - `events.bearbeiten`, `tickets.bearbeiten`, `codes.bearbeiten`
  - `bestellungen.sehen`, `bestellungen.verwalten`, `bestellungen.erstatten`
  - `gaesteliste.bearbeiten`, `nachrichten.senden`
  - `einlass.nutzen`, `abendkasse.nutzen`, `abendkasse.preise`
  - `umsatz.sehen`, `finanzen.sehen`, `gutscheine.bearbeiten`
  - `profil.bearbeiten`, `team.verwalten`, `einstellungen.bearbeiten`, `bank.bearbeiten`

Rollen und ihre Rechte:
- `inhaber`: alle Rechte.
- `admin`: alle außer `bank.bearbeiten`.
- `eventmanager`: alle außer `bestellungen.erstatten`, `finanzen.sehen`, `gutscheine.bearbeiten`, `team.verwalten`, `einstellungen.bearbeiten` und `bank.bearbeiten`.
- `finanzen`: `bestellungen.*`, `umsatz.sehen`, `finanzen.sehen`, `gutscheine.bearbeiten`; alles andere nur lesen.
- `einlass`: nur `einlass.nutzen`, `abendkasse.nutzen` und `gaesteliste.bearbeiten` (nur Check-in). Kein Umsatz sichtbar.

## Demodaten (Seed, deterministisch mit Seed-PRNG, Zeiten relativ zu `seededAt`)

- **Nutzerin:** Mara Lindner. Sie ist `inhaber` bei „Kulturhaus Lindenhof e.V.“ und `eventmanager` bei „Abikur IKG 2027“.
- **Organisationen:**
  - **Kulturhaus Lindenhof e.V.** (`kulturhaus-lindenhof`): Verein, aktiv, Regelbesteuerung 7 %, Gebühr 5 % + 0,49 € zahlt der Käufer. Logo, Profil und Socials sind vollständig, 4 Teammitglieder.
  - **Abikur IKG 2027** (`abikur-ikg-2027`): Schule, aktiv, Kleinunternehmer, Gebühr 3,5 % + 0,29 € zahlt der Veranstalter.
  - **Studio Balance Pilates** (`studio-balance`): in Prüfung, ein Entwurf.
  - **Nachtwerk Events GmbH** (`nachtwerk-events`): gesperrt, nur für die Admin-Liste.
- **Feste IDs:**
  - Organisationen: `org-lindenhof`, `org-abikur`, `org-studio-balance`, `org-nachtwerk`.
  - Events (ID → Slug):
    - `ev-sommernacht` → `sommernachtskonzert`
    - `ev-indie-night` → `indie-night-lichtspiel`
    - `ev-jazz-wein` → `jazz-und-wein`
    - `ev-winterball` → `winterball`
    - `ev-lesung` → `lesung-stadt-der-stimmen`
    - `ev-abiball-2027` → `abiball-2027`
    - `ev-pilates-probe` → `pilates-probestunde`
    - `ev-poetry-slam` → `poetry-slam-herbstworte` (Lindenhof, vor 5 Tagen, Auszahlung `bereit`)
    - `ev-abi-warmup` → `abi-warm-up-party` (Abikur, vor 25 Tagen, ausgezahlt)
  - Alle Uhrzeiten beziehen sich auf Europe/Berlin.
- **Events Lindenhof:**
  - „Sommernachtskonzert im Hof“: vor 12 Tagen, 19:30, ausgezahlt.
  - „Indie Night: Lichtspiel“: läuft gerade. Einlass seit 60 Min., Beginn in 30 Min. (auf Viertelstunden gerundet), Dauer 4 h.
    - Kapazität 480, etwa 430 verkauft, etwa 300 eingecheckt, 9 abgelehnte Scans.
    - Abendkasse aktiv mit „Abendkasse Stehplatz 28 €“ (Kontingent 50).
  - „Jazz & Wein“: in 3 Wochen, 20:00. Early Bird beendet, Phase 1 aktiv, Rabattcodes `JAZZ10` und `FREUNDE5`, Zugangscode `PRESSE-JAZZ` für „Presse“ (versteckt).
  - „Winterball im Lindenhof“: in 10 Wochen, 19:00, Early Bird aktiv, Gästeliste mit den Kontingenten Presse, Band & Crew und Freikarten Verein.
  - „Lesung: Stadt der Stimmen“: Entwurf ohne Beschreibung und ohne Alt-Text (für die Setup-Checkliste).
  - Eine Vorlage „Konzert im Hof“.
- **Events Abikur:** „Abiball 2027“ in 5 Monaten.
  - Ticketarten: Schüler:innen (versteckt, Zugangscodes je Klasse), Gäste (Phase 1 und Phase 2), Lehrkräfte (versteckt).
  - 6 Zugangscodes, z. B. `ABI-12A` mit 60 Tickets.
- **Bestellungen:** etwa 600, realistisch über die Zeit verteilt.
  - Mischung der Zahlarten.
  - 3 % storniert oder erstattet, 1 Rückbuchung, einzelne offene SEPA-Zahlungen.
  - Mit deutschen Namen und einigen Notizen.
- **Kundin „Lea Schneider“** (`lea.schneider@example.de`) für das Kundenkonto:
  - 2 Tickets für Indie Night, 1 Ticket für Jazz & Wein.
  - 1 erstattete Bestellung für das Sommernachtskonzert.
- **Admin-Sicht:** Auszahlungen für vergangene Events mit `ausgezahlt` bzw. `bereit`, dazu ein gefülltes Änderungsprotokoll.
- **Bilder:** `urlImage(imageList.i1920x1080_webp_{concert_crowd,festival_lights,stage_beams,event_production,dj_stage})` und `imageList.pilates_detail`, jeweils mit Alt-Text.

## UX-Regeln (verbindlich, gelten für jede Seite)

1. **Eine Hauptaktion je Seite**, oben rechts im PageHeader als `filled`-Button mit Icon. Weitere Aktionen sind `outline`, alles Seltene kommt ins `⋯`-Menü.
2. **Wenig Text:**
   - Titel 1–3 Wörter, Buttons Verb + Objekt („Event erstellen“).
   - Leere Zustände: Icon, ein Satz, ein Button.
   - Hilfe steckt im ⓘ-Popover (`InfoPopover`), nie als Absatz auf der Seite.
   - Kein Fülltext, kein „Hier kannst du …“.
3. **Icons:**
   - Jeder Navigationseintrag, jede Kennzahl und jeder Status hat ein Icon.
   - Icon-only-Buttons bekommen `aria-label` und einen Tooltip (`title`).
4. **Zahlen zuerst:**
   - Kennzahlen groß (`text-2xl font-semibold tabular-nums`), Labels klein (`text-xs text-content-muted`).
   - Geld immer mit „€“ im deutschen Format, rechtsbündig in Tabellen.
5. **Status:**
   - Farbige Pills mit Punkt.
   - Grün (aktiv, bezahlt, gültig), Amber (offen, geplant, bald), Rot (storniert, abgelehnt, gesperrt), Grau (Entwurf, beendet), Teal/Brand (live, im Verkauf).
   - Eine zentrale Zuordnung in `src/dash/ui/` (`DashStatusPill`).
6. **Bearbeiten im Seitenpanel:**
   - Details und Bearbeiten öffnen ein Sheet von rechts (Desktop 480–560 px, mobil als Bottom-Sheet bzw. Vollbild). Die Liste bleibt sichtbar.
   - Offene Sheets stehen in der URL.
   - Ganze Seiten nur für komplexe Inhalte wie Eventdetails oder den Assistenten.
7. **Speichern:**
   - In Formularen erscheint bei ungespeicherten Änderungen eine Sticky-Leiste „Ungespeicherte Änderungen · Verwerfen · Speichern“.
   - Schalter (Switch) wirken sofort und zeigen einen Toast.
8. **Destruktive Aktionen:**
   - Bestätigungsdialog, der die Folgen als Liste zeigt (z. B. „3 Tickets werden ungültig · 45,00 € werden erstattet · Käufer bekommt eine E-Mail“).
   - Bei Absage oder Löschen den Eventnamen eintippen.
   - Danach ein Toast, wo möglich mit „Rückgängig“.
9. **Tabellen:**
   - Sticky-Kopf, Suche oben links, Filter-Chips, Export rechts.
   - Klick auf eine Zeile öffnet das Sheet.
   - Mehrfachauswahl mit Aktionsleiste.
   - Mobil als Karten-Liste, nie seitlich scrollen.
   - Leerer Filter: „Keine Treffer“ mit „Filter zurücksetzen“.
10. **Zustände:** Laden als Skeleton (kurz simuliert nur dort, wo es Sinn ergibt), leer, Fehler, keine Berechtigung (Schloss-Icon + „Nur für Finanzen“ o. ä.).
11. **Mobil zuerst für Einlass, Kasse und Abendkasse:**
    - Touch-Ziele ≥ 44 px, große Ergebnisanzeigen in voller Bildschirmfarbe.
    - Das Dashboard ist auch mobil voll benutzbar (Sidebar als Drawer, unten eine Tab-Leiste mit 4 Einträgen + „Mehr“).
12. **Tastatur:**
    - `⌘K`/`Strg+K` öffnet die Befehlspalette (Seiten, Events, Bestellung per Nummer, Aktionen).
    - `Esc` schließt Sheets, sichtbarer Fokus-Ring (`ring-ring`).
13. **Barrierefreiheit:** Labels an allen Inputs, ausreichende Kontraste (auch im Dark Mode), `aria-live` für Toasts und Scan-Ergebnisse.
14. **Verbindungen statt Sackgassen:**
    - Jede Zahl führt zur gefilterten Liste (z. B. KPI „Offene Zahlungen“ → Bestellungen mit `?status=offen`).
    - Jedes Event führt zur öffentlichen Seite („Ansehen ↗“).
    - Jede Bestellung führt zu ihren Tickets.
15. **Demo-Kennzeichnung:**
    - Ein schmales Badge „Demo“ in der Topbar mit Menü: Rolle simulieren, Testbestellungen erzeugen (+10, verteilt auf kommende Events), Demo zurücksetzen, Leeres Konto, Zum Demo-Verzeichnis.
    - Keine sonstigen Demo-Hinweise im Inhalt.

## Visuelles System

- **Bestehende Tokens:**
  - Flächen `bg-surface-base` (Seite), `bg-surface` (Karten), `bg-surface-muted` (Hover, Leisten).
  - Text `text-content`, `text-content-muted`, Rahmen `border-border-subtle`.
  - Marke `bg-brand`, `text-brand`, `bg-brand-soft`, Akzent `accent` (Amber) nur für Hinweise.
  - Status `success`, `warning`, `danger` plus `*-soft`.
  - Radien `rounded-card` (16 px) und `rounded-control` (12 px).
  - Der Dark Mode läuft über die `.dark`-Klasse. Die Status-Tokens haben keine Dark-Werte; die neuen Komponenten ergänzen sie mit `dark:`-Klassen (siehe Entscheidungen).
- **Karten:** `rounded-card border border-border-subtle bg-surface` mit `shadow-sm` höchstens beim Hover. Innenabstand `p-4 sm:p-5`, Abstand zwischen Sektionen `gap-6`.
- **Typografie:**
  - System-Schrift wie bisher.
  - Seitentitel `text-xl sm:text-2xl font-semibold tracking-tight`.
  - Sektionstitel `text-sm font-semibold`, Tabellenkopf `text-xs font-medium uppercase tracking-wide text-content-muted`.
- **Dichte:** Tabellenzeilen 44–52 px, Formularfelder 40 px, kompakte Toolbar 36 px.
- **Diagramme:**
  - Linien und Flächen in `brand` mit 15 % Füllung.
  - Vergleich gestrichelt `content-muted`, Gitter `border-subtle` mit 50 % Deckkraft.
  - Tooltip als Karte, keine 3D-Effekte, keine Legenden mit mehr als 4 Einträgen.
- **Bewegung:** nur kurze Übergänge (150–200 ms) für Sheet, Toast und Hover, `prefers-reduced-motion` wird beachtet.
- **Dash-Dichte** (verbindlich, weil `Button` keine Höhe und Schriftgröße setzt und `classMerge` mit `cn` überschreibbare Klassen erlaubt):
  - Buttons im Dashboard bekommen immer `class` mit `h-9 px-3 text-sm gap-1.5` (klein: `h-8 px-2.5 text-sm`). Icons darin `size-4`, über `iconClass="size-4 mr-1.5"` bei `ButtonIcon`.
  - Hauptaktion: `variant="contrast"` ist Standard für Primäraktionen (dunkel/hell invertiert). Brand-Teal nur für Aktionen auf öffentlichen Seiten und Erfolgsflächen.
  - Formularfelder: `Input` und `Textarea` mit `class="h-10 text-sm rounded-control"`, Labels `text-sm font-medium`.
  - Tabellen und Listen in `text-sm`. Überschriften wie unter Typografie.
  - Status-Pills im Dashboard sind immer `DotPill` (soft), nie die gefüllten `Badge`-Varianten.
  - Seiten-Hintergrund `bg-surface-base`, Karten `bg-surface`. Topbar ohne SiteFrame.
  - Rahmen immer mit Farbe: `border border-border-subtle`. In Tailwind v4 ist die Standardfarbe von `border` `currentColor`, ein nacktes `border` wird also dunkel.
  - `CardWrapper` aus `#ui/static/card` hat einen dunklen Rahmen und wird von produktiven Seiten genutzt. Er bleibt unverändert und wird im Dashboard nicht verwendet; stattdessen `DashSection` oder eigene Karten.
  - Bestehende Dateien in `ui/` werden nicht geändert. Neue Bausteine kommen in neue Dateien.

## Referenzen (Wettbewerb; Screenshots in `/tmp/opencode/eventoren-refs/`)

- **Übernommen:**
  - pretix: Codes einzeln anlegen und „Mehrere erstellen“ mit Präfix, Anzahl und Limit (`pretix-05-*.png`); Event kopieren mit dem Hinweis, die Daten zu prüfen (`pretix-03-*.png`).
  - Luma:
    - Bestell-Panel mit Verlauf und Erstattung direkt neben den Zahlungsdaten (`luma-06-*.png`).
    - Export „Alle“ oder „Gefiltert“ (`luma-07-*.png`).
    - Abendkasse über einen QR-Link (`luma-09-*.png`).
    - Gäste direkt ohne Zahlung hinzufügen (`luma-14-*.png`).
  - Tito: Event-Kennzahlen zusammen mit einem Diagramm (`tito-01-dashboard.png`).
- **Vermeiden:**
  - Org- und Event-Kennzahlen vermischen.
  - Leere Zustände ohne nächste Aktion.
  - Beim Duplizieren Datumswerte stillschweigend übernehmen.
  - Erstatten, ohne die Folgen zu zeigen.
  - Zu weite Rechte für das Einlass-Personal.
  - Unklare Auswahl bei Exporten und Empfängern.

## Seiten-Spezifikationen

### S1 Dashboard-Shell (`src/dash/ui/DashShell.tsx`)

- **Desktop (≥ 1024 px):**
  - Feste Sidebar, 248 px breit, `bg-surface`, rechts eine Linie. Daneben der Inhalt (`bg-surface-base`) mit max. Breite 1280 px, zentriert, `px-4 sm:px-6 lg:px-8 py-6`.
  - Unter 1024 px ist die Sidebar ein Drawer (`Sidebar` aus `#ui/interactive/sidebar`); unten erscheint eine Tab-Leiste.
- **Sidebar von oben nach unten:**
  1. **Org-Wechsler:** Logo (32 px, `rounded-lg`), Name, Rolle als kleines Label, Chevron.
     - Das Popover listet die Organisationen mit Haken bei der aktiven.
     - Darunter: „Organisation erstellen“ → `/demo/onboarding`, „Öffentliches Profil ↗“.
  2. **Suche:** „Suchen … ⌘K“ öffnet die Befehlspalette.
  3. **Org-Navigation:**
     - Übersicht (`mdiViewDashboardOutline`)
     - Events (`mdiCalendarMonthOutline`, Zähler kommender Events)
     - Bestellungen (`mdiReceiptTextOutline`)
     - Gutscheine (`mdiGiftOutline`)
     - Finanzen (`mdiBankOutline`)
  4. **Bereich „Organisation“:**
     - Profil (`mdiStorefrontOutline`)
     - Team (`mdiAccountGroupOutline`)
     - Einstellungen (`mdiCogOutline`)
  5. **Unten:** Hilfe ⓘ (Popover mit 3 Links), Nutzer (Avatar mit Initialen, Name, Menü: Kundenkonto ↗ `/demo/customer/konto`, Hell/Dunkel, Abmelden (nur Toast)).
- **Event-Kontext** (Pfad `/demo/dashboard/events/<id>/...`):
  - Die Org-Navigation wird ersetzt durch: `‹ Alle Events`, darunter Event-Wechsler (Thumbnail 32 px, Titel, Datum, Status-Pill, Popover mit Suche).
  - Event-Navigation:
    - Übersicht (`mdiChartBoxOutline`)
    - Details (`mdiPencilOutline`)
    - Tickets (`mdiTicketOutline`)
    - Codes (`mdiTicketPercentOutline`)
    - Bestellungen (`mdiReceiptTextOutline`)
    - Teilnehmer (`mdiAccountMultipleOutline`)
    - Gästeliste (`mdiAccountStarOutline`)
    - Einlass (`mdiQrcodeScan`, grüner Live-Punkt am Eventtag)
    - Abendkasse (`mdiCashRegister`)
    - Nachrichten (`mdiEmailOutline`)
    - Abrechnung (`mdiScaleBalance`)
    - Protokoll (`mdiHistory`)
  - Einträge ohne Recht werden ausgeblendet.
- **Topbar** (56 px, sticky, `bg-surface/80 backdrop-blur`):
  - Links: Breadcrumb („Events / Indie Night / Bestellungen“, auf Mobil nur die letzte Ebene + Zurück-Pfeil).
  - Rechts: Badge „Demo ▾“ (Demo-Menü, UX-Regel 15), Hell/Dunkel-Umschalter (`ThemeButton`), Benachrichtigungen (`mdiBellOutline` mit 3 Demo-Hinweisen, z. B. „Phase 1 von Jazz & Wein endet morgen“).
- **Mobile Tab-Leiste:** Übersicht · Events · Bestellungen · Einlass (öffnet das heutige Event) · Mehr (Drawer).
- **Befehlspalette** (`⌘K`, Dialog oben mittig):
  - Gruppen: Seiten, Events, Bestellungen (Suche nach Nummer oder Name), Aktionen („Event erstellen“, „Code erstellen“, „Gast hinzufügen“, „Export“).
  - Bedienung mit Pfeiltasten und Enter.
- **Rollenwechsel:** Rolle simulieren im Demo-Menü ändert Navigation, Aktionen und Kennzahlen sofort.

### S2 Übersicht (`/demo/dashboard`)

- **PageHeader:**
  - „Hallo Mara“, Untertitel mit dem heutigen Datum.
  - Hauptaktion „Event erstellen“ (`mdiPlus`), daneben Zeitraum-Segment „7 Tage | 30 Tage | 12 Monate“.
- **Heute-Karte** (nur wenn heute ein Event ist; Brand-Rand links, Bild links):
  - Titel, „Einlass läuft · 20:00“, Fortschrittsbalken „312 / 431 eingecheckt“.
  - Buttons: „Live-Einlass“, „Kassenmodus ↗“, „Scanner-Link teilen“.
- **KPI-Reihe** (4 Karten, mobil 2×2), jeweils mit Icon, Wert, Delta in Grün oder Rot mit Pfeil gegenüber dem Vorzeitraum und einer Sparkline:
  - Umsatz
  - Verkaufte Tickets
  - Bestellungen
  - Ø Bestellwert
- **Verkaufskurve:**
  - Flächendiagramm Umsatz pro Tag, Vorzeitraum gestrichelt.
  - Tooltip mit Datum, Umsatz und Tickets.
  - Umschalter „Umsatz | Tickets“.
- **Zwei Spalten** (Desktop 2/3 + 1/3):
  - **Links „Nächste Events“:** Liste mit Thumbnail, Titel, Datum, Status-Pill und Auslastungsbalken („318 / 480 · 66 %“). Klick → Event-Übersicht. Rechts in der Zeile „Ansehen ↗“.
  - **Rechts „Aktivität“** (Live-Feed, 8 Einträge, relative Zeit), z. B.:
    - „Neue Bestellung EV-260412 · 2 × Stehplatz · 64,00 €“
    - „Phase 1 automatisch gestartet“
    - „Code JAZZ10 3× eingelöst“
  - **Darunter „To-dos“:**
    - „Lesung: Stadt der Stimmen veröffentlichen“
    - „Profil: Social-Links ergänzen“
    - „2 SEPA-Zahlungen offen“
- **Rolle Einlass:** keine Umsatz-KPIs; nur die Heute-Karte und die nächsten Events.
- **Leer** (Organisation ohne Events): großes Icon (`mdiCalendarPlus`), „Erstelle dein erstes Event“, Buttons „Event erstellen“ und „Aus Vorlage“.

### S3 Events-Liste (`/demo/dashboard/events`)

- **PageHeader:** „Events“, Hauptaktion „Event erstellen“ als Split-Button (▾: „Leeres Event“, „Aus Vorlage …“).
- **Tabs** (`?tab=`): Aktuell (Zähler) · Entwürfe (Zähler) · Vergangen · Vorlagen.
- **Toolbar:** Suche, Kategorie-Filter-Chip, Ansicht „Liste | Kacheln“ (bestehende `AdminListViewControl`-Optik übernehmen).
- **Liste:**
  - Zeile mit Thumbnail (64×40 `rounded-lg`), Titel + Ort, Datum (Wochentag, Datum, Uhrzeit), Status-Pill.
  - Verkauf als Balken mit „318 / 480“, Umsatz (rechtsbündig).
  - `⋯`-Menü: Öffnen, Ansehen ↗, Duplizieren, Als Vorlage speichern, Verkauf pausieren/fortsetzen, Absagen (rot).
- **Kacheln:** Bild 16:9, Datum als Kalenderblatt-Badge oben links, Status oben rechts, unten Titel, Auslastungsbalken und Umsatz.
- **Tab „Vorlagen“:** Karten mit Name, Kategorie, Anzahl Ticketarten, Buttons „Verwenden“ und `⋯` (Umbenennen, Löschen).
- **Duplizieren:** Dialog „Neues Datum“ (Datum/Uhrzeit, vorbelegt mit derselben Uhrzeit eine Woche später).
  - Hinweis-Chips: „Phasen und Verkaufsdaten werden mitverschoben“, „Codes werden nicht übernommen“.
  - Ergebnis: Entwurf, danach Weiterleitung zu dessen Details.
- **Als Vorlage speichern:** Dialog mit Name. Toast „Vorlage gespeichert“ mit Link „Ansehen“.

### S4 Event-Assistent (`/demo/dashboard/events/neu`)

- Vollbreite Seite mit eigener Kopfzeile:
  - „✕ Abbrechen“ links (bei Änderungen mit Rückfrage).
  - Schrittanzeige mittig: 1 Basis · 2 Tickets · 3 Prüfen (`Timeline` horizontal oder eigener Stepper).
  - Rechts „Als Entwurf speichern“.
- **Schritt 1 „Basis“:**
  - Felder: Titel, Kategorie (Chips mit Icons), Beginn (Datum + Uhrzeit), Ende, Einlass (optional, „30 Min. vorher“ als Schnellwahl).
  - Ort: Name, Straße, PLZ, Stadt. Zuletzt genutzte Orte als Chips.
  - Titelbild: Galerie mit 6 Demo-Bildern oder Upload, Alt-Text als Pflichtfeld, das automatisch aus dem Titel vorbelegt wird und sichtbar bearbeitbar ist.
  - Rechts als Live-Vorschau eine Event-Karte (sticky).
- **Schritt 2 „Tickets“:**
  - Mindestens 1 Ticketart, Schnellstart-Chips: „Standard“, „Early Bird + Regulär“, „Ermäßigt“, „Kostenlos“.
  - Je Ticketart: Name, Preis, Kontingent, Steuersatz (19 % / 7 %, Standard aus der Organisation).
  - „Preisphasen“ aufklappbar, „Versteckt“-Schalter.
  - Unten eine Live-Rechnung: „Käufer zahlt 25,74 € · Du erhältst 24,50 €“ (`dashFeeCompute`).
- **Schritt 3 „Prüfen“:**
  - Zusammenfassung als Checkliste mit grünen Haken bzw. Warnungen (z. B. „Keine Beschreibung — später ergänzen“).
  - Sichtbarkeit: Öffentlich oder Nicht gelistet.
  - Buttons: „Veröffentlichen“ (filled) und „Als Entwurf speichern“.
  - Danach ein Erfolgsdialog mit Haken-Icon, Feld zum Kopieren des Links, „Seite ansehen ↗“ und „Zum Event“.
- **Aus Vorlage:** `?vorlage=<id>` füllt alle Schritte vor, nur das Datum bleibt leer.
- Validierung erst beim Weitergehen; Fehler stehen am Feld.

### S5 Event-Übersicht (`/demo/dashboard/events/<id>`)

- **Event-Rahmen** (`DashEventLayout`, gilt für alle Event-Unterseiten):
  - Unterseiten zeigen nur ihren eigenen `DashPageHeader` (z. B. „Tickets“). Den Event-Kontext liefern Breadcrumb und Eventkarte in der Sidebar.
  - Über jeder Unterseite steht ein schmales Banner:
    - Entwurf (Amber): „Entwurf · nur für dich sichtbar“ und „Veröffentlichen“.
    - Abgesagt (Rot): „Abgesagt am …“.
    - Verkauf pausiert (Grau): „Verkauf pausiert“ und „Fortsetzen“.
  - Ist das Event unbekannt oder gehört es nicht zur aktiven Organisation: EmptyState „Event nicht gefunden“ und „Zu den Events“.
- **Event-Kopf** (nur auf der Event-Übersicht, `DashEventHeader`):
  - Thumbnail, Titel, Datum · Ort, Status-Pill, Sichtbarkeit.
  - Aktionen: „Ansehen ↗“, „Link kopieren“ (`mdiContentCopy`), Hauptaktion je nach Zustand:
    - Entwurf → „Veröffentlichen“
    - im Verkauf → „Teilen“
    - heute → „Live-Einlass“
  - `⋯`: Duplizieren, Als Vorlage speichern, Verkauf pausieren, Absagen.
- **Setup-Checkliste** (nur bei Entwurf, einklappbar, Fortschritt „3 / 5“):
  - Basisdaten
  - Titelbild + Alt-Text
  - Ticketarten
  - Beschreibung
  - Veröffentlichen
- **KPIs:** Umsatz · Verkauft / Kapazität · Eingecheckt (am Eventtag) · Offene Zahlungen. Jede Kennzahl ist ein Link (UX-Regel 14).
- **Ticketarten-Tabelle:** Name, aktive Phase (Pill „Phase 1 · endet in 3 Tagen“ oder „ab 24 Tickets“), Preis, verkauft/Kapazität als Balken, Umsatz. Link „Bearbeiten“ → Tickets.
- **Verkaufskurve** (kumulierte Tickets seit Verkaufsstart, Phasenwechsel als vertikale Markierungen) und Kanäle als Donut (Online, Abendkasse, Gästeliste).
- **Letzte Bestellungen** (5) mit „Alle ansehen“.

### S6 Event-Details (`…/details`)

- Ganzseitiges Formular in Karten-Sektionen, rechts (Desktop) eine sticky Mini-Navigation mit Anker-Links. Sticky-Speicherleiste (UX-Regel 7).
- **Sektionen:**
  - **Basis:** Titel, Untertitel, Kategorie, Beginn, Ende, Einlass.
  - **Ort:** Felder wie im Assistenten, dazu Link „In Karten öffnen ↗“.
  - **Bild:**
    - Vorschau 16:9 mit „Ändern“ (Galerie oder Upload).
    - Alt-Text als Pflichtfeld mit Zähler 0/150. Fehlt er, ist Veröffentlichen gesperrt; das Feld ist rot markiert.
  - **Beschreibung:**
    - Textarea mit kleiner Toolbar (Fett, Kursiv, Überschrift, Liste, Link), die Markdown-Kürzel einfügt.
    - Umschalter „Schreiben | Vorschau“ (`dashMarkdownParse`).
  - **Ablauf:**
    - Liste von Uhrzeit + Titel + Detail, sortierbar per Drag-and-drop (natives HTML5-DnD wie `AdminTicketProductsForm`), dazu „Punkt hinzufügen“.
    - Leer: „Aus Eventdaten erzeugen“ (Einlass, Beginn, Ende).
  - **FAQ:** Frage-Antwort-Paare, aufklappbar, sortierbar, dazu „Frage hinzufügen“ und Chips mit häufigen Fragen (Parken, Garderobe, Mindestalter, Barrierefreiheit).
  - **Sichtbarkeit:** Öffentlich oder Nicht gelistet, dazu der Schalter Verkauf pausiert.
- **Fußleiste:** Gefahrenzone „Event absagen“ (UX-Regel 8, öffnet eine Absage-Nachricht an alle als Entwurf).

### S7 Tickets (`…/tickets`)

- **PageHeader:** „Tickets“, Hauptaktion „Ticketart hinzufügen“. Zwei Abschnitte: „Online“ und „Abendkasse“ (Kanal).
- **Liste als Karten:**
  - Griff zum Sortieren, Name, Badges („Versteckt“ mit `mdiEyeOffOutline`, „Pausiert“), Preis der aktiven Phase, Auslastungsbalken.
  - Phasen-Zeitleiste: Segmente nebeneinander mit Name und Preis, das aktive Segment in Brand, beendete grau durchgestrichen.
  - Klick → Sheet.
- **Sheet „Ticketart“** (`?ticket=<id>|neu`):
  - Name, Beschreibung (kurz), Kanal (Online | Abendkasse).
  - Kontingent, max. pro Bestellung, Steuersatz (19 % / 7 %; bei Kleinunternehmern ausgeblendet, Info-Chip „Kleinunternehmer – keine USt“).
  - Versteckt-Schalter (Info: „Nur mit Zugangscode sichtbar“ + Link „Zugangscode erstellen“).
  - Verkaufszeitraum: Start (sofort | Datum), Ende (bei Eventbeginn | Datum).
  - **Preisphasen:**
    - Tabelle mit Name · Preis · endet am (Datum oder „—“) · oder nach (Anzahl Tickets oder „—“) · Löschen. Dazu „Phase hinzufügen“.
    - Schnellwahl „Early Bird + Regulär“.
    - Hinweiszeile „Wechsel automatisch, sobald Datum oder Anzahl erreicht ist“.
  - **Preisrechner** für die aktive Phase: „Ticket 24,50 € · Gebühr 1,72 € · Käufer zahlt 26,22 € · Du erhältst 24,50 €“ (bzw. bei Veranstalter-Gebühr umgekehrt). Gebührenmodell nur lesbar mit ⓘ „Vom Plattform-Admin festgelegt“.
  - Footer: „Löschen“ (nur ohne Verkäufe, sonst „Archivieren“), „Speichern“.
- **Abendkasse-Abschnitt** ohne Ticketarten: Leer-Hinweis „Lege Preise für die Abendkasse fest“ + Button. Er verlinkt auf die Abendkasse-Seite.

### S8 Codes (`…/codes`)

- **Tabs:** Rabattcodes · Zugangscodes (`?art=`).
- **PageHeader:** Hauptaktion „Code erstellen“, sekundär „Mehrere erstellen“ (`mdiLayersTripleOutline`), `⋯` Export CSV.
- **Tabelle:**
  - Code (Monospace, Kopier-Icon), Wert („10 %“ / „5,00 €“ bzw. „schaltet frei: Schüler:innen“), Gilt für (Ticketarten-Chips oder „Alle“).
  - Nutzung als Balken „34 / 60“ (bzw. „34 / ∞“), Gültig (Zeitraum), Aktiv-Schalter (sofort, mit Toast).
  - Mehrfachauswahl mit der Aktionsleiste: Aktivieren, Deaktivieren, Gültigkeit ändern, Limit ändern, Löschen (nur unbenutzt).
- **Sheet „Code“** (`?code=<id>|neu`):
  - Code (Eingabe in Großbuchstaben mit „Zufällig“-Button), Art (Rabatt | Zugang).
  - Rabatt: Segment „Prozent | Betrag“ + Wert. Zugang: Auswahl versteckter Ticketarten.
  - Gilt für, max. Tickets gesamt (leer = unbegrenzt), gültig von/bis, interne Notiz.
  - Darunter eine Vorschau „So sieht der Käufer es“: Code-Feld mit grüner Erfolgsmeldung („JAZZ10 – 10 % Rabatt“).
- **Dialog „Mehrere erstellen“** (`?mehrere=1`):
  - Präfix (z. B. „ABI-“), Anzahl (1–500), Art, Wert bzw. Freischaltung, Limit je Code.
  - Live-Vorschau mit 5 Beispielcodes. Ergebnis: Toast + „Als CSV herunterladen“.
- **Leer:** Icon `mdiTicketPercentOutline`, „Noch keine Codes“, Button „Code erstellen“.

### S9 Bestellungen (`…/bestellungen` und `/demo/dashboard/bestellungen`)

- **Toolbar:**
  - Suche (Nummer, Name, E-Mail).
  - Status-Chips mit Zählern: Alle · Bezahlt · Offen · Storniert · Erstattet.
  - Kanal-Filter, auf Org-Ebene zusätzlich der Event-Filter.
  - Rechts „Exportieren ▾“ (CSV, Excel, PDF).
- **Tabelle:** Nummer (Monospace), Käufer (Name + E-Mail klein), Tickets (Anzahl), Betrag (rechts), Zahlart (Icon), Datum (relativ, Tooltip absolut), Status-Pill.
- **Sheet „Bestellung“** (`?bestellung=<id>`):
  - **Kopf:** Nummer, Status, Datum, Betrag groß.
  - **Aktionsreihe** (Icons + Text): Tickets erneut senden (`mdiEmailFastOutline`), Rechnung (PDF), Erstatten (`mdiCashRefund`), Stornieren (rot, im `⋯`).
  - **Käufer:** Name, E-Mail (kopieren), „Käuferdaten bearbeiten“.
  - **Tickets:** je Ticket Code, Ticketart, Inhaber, Einlass-Status (eingecheckt um …) und Stift-Icon „Umschreiben“ (Inline-Formular Name + E-Mail → Toast „Ticket auf … umgeschrieben · neue E-Mail gesendet“).
  - **Zahlung:**
    - Aufschlüsselung: Positionen, Rabatt, Gutschein, Servicegebühr, Summe, Zahlart.
    - USt-Zeile nach Satz, bei Kleinunternehmern der Hinweis § 19.
    - Erstattungen als negative Zeilen.
  - **Notizen (intern):** Liste mit Autor und Zeit, Eingabe „Notiz hinzufügen“, Hinweis-Icon „Nur für dein Team sichtbar“.
  - **Verlauf:** Timeline (bestellt, bezahlt, E-Mail gesendet, eingecheckt, erstattet, Notiz).
- **Dialog „Erstatten“:**
  - Auswahl je Ticket (Checkboxen) oder „Betrag frei“; Servicegebühr erstatten ja/nein.
  - Tickets ungültig machen ja/nein (Standard ja bei ganzen Tickets), Grund (Select + Freitext).
  - Zusammenfassung der Folgen (UX-Regel 8). Ergebnis: Status `teilerstattet` oder `erstattet`.
- **Stornieren:** wie Erstatten, aber alle Tickets mit vollem Betrag. Der Käufer erhält eine E-Mail (Verlaufseintrag).

### S10 Teilnehmer (`…/teilnehmer`)

- Eine Zeile je Ticket, auch Gästeliste und Abendkasse.
- **Toolbar:** Suche, Filter: Ticketart, Check-in (alle | eingecheckt | offen), Kanal.
- **Spalten:** Name, E-Mail, Ticketart, Code, Bestellung (Link öffnet das Bestell-Sheet), Check-in (Uhrzeit + Eingang oder „—“), mit Aktion „Manuell einchecken“ bzw. „Check-in zurücknehmen“.
- **Export-Menü:**
  - **„Teilnehmerliste“:** CSV, Excel, PDF. Das PDF ist eine druckbare Einlassliste: A4 quer, alphabetisch, Spalten Name · Ticketart · Code · ☐, Kopf mit Eventtitel, Datum und Seitenzahlen.
  - „Bestellungen“: CSV, Excel.
  - „Check-ins“: CSV mit Zeit, Eingang, Ergebnis, Gerät.
  - Jeweils mit Hinweis „Gefiltert (123)“ oder „Alle (431)“.
- **Button „Drucken“** (`mdiPrinterOutline`): Druckansicht im Browser mit eigenem Print-CSS.

### S11 Gästeliste (`…/gaesteliste`)

- **Kontingente oben** als Karten: Name, Fortschritt „12 / 20“, `⋯` (Bearbeiten, Löschen), dazu „Kontingent hinzufügen“ (Name + Limit). Beispiele: Presse, Band & Crew, Freikarten Verein.
- **Hauptaktion:** „Gäste hinzufügen“ öffnet ein Sheet mit 2 Tabs:
  - **Einzeln:** Name, E-Mail (optional), Kontingent, Begleitpersonen (+0 bis +5), Notiz, Schalter „Ticket per E-Mail senden“.
  - **Mehrere:** eine Zeile je Gast „Name, E-Mail“, dazu Live-Erkennung mit Zähler „12 erkannt · 1 Fehler“.
- **Liste:** Name, Kontingent-Chip, „+2“, Ticket (gesendet ✓ oder „Senden“), Check-in-Status mit „Einchecken“-Button (Rolle Einlass: nur dieser Button).
- **Kontingent voll:** Hinzufügen ist gesperrt mit Hinweis.

### S12 Live-Einlass (`…/einlass`)

- **Kopf:**
  - Großer Fortschrittsring „312 / 431 eingecheckt · 72 %“.
  - Daneben „Letzte 15 Min: +38“ und ein Mini-Balkendiagramm mit Check-ins pro 15 Minuten.
  - Live-Punkt „Live“ mit Puls.
- **Simulation:** Am Eventtag kommen im Demo-Modus alle 4–8 s neue Scans hinzu, abschaltbar per Toggle „Live-Simulation“ in der Toolbar.
- **Aufschlüsselung:**
  - Je Ticketart: Balken eingecheckt/verkauft.
  - Je Eingang: Haupteingang, Seiteneingang, Abendkasse mit Zählern und Gerät/Scanner-Link-Name.
- **Scan-Protokoll:** Live-Liste mit Zeit, Ergebnis-Icon (✓ grün, ✕ rot), Name/Code, Eingang. Filter-Chips: Alle · Akzeptiert · Abgelehnt (Zähler, rot).
  - Abgelehnte Scans zeigen den Grund (Doppelt eingescannt · Falsches Event · Unbekannter Code · Storniert).
- **Scanner:**
  - Button „Scanner öffnen“ führt zum bestehenden Scanner-Demo (`/demo/admin/organizer/event/xyz`).
  - Karte „Scanner-Links für Helfer“: Liste mit Label, Eingang, zuletzt genutzt, „Kopieren“, „QR anzeigen“, „Widerrufen“; dazu „Link erstellen“.
  - Ein manueller Check-in per Code-Eingabe (Testfeld) schreibt einen Scan, inklusive Fehlerfällen.

### S13 Abendkasse (`…/abendkasse`, `/demo/kasse/<id>`, `/demo/abendkasse/<id>`)

- **Seite im Dashboard:**
  - Schalter „Abendkasse aktiv“, Öffnungszeit (Standard = Einlass).
  - Abendkasse-Ticketarten mit Preis und Kontingent (nur mit Recht `abendkasse.preise` bearbeitbar; sonst Schloss + „Preise legt der Veranstalter fest“).
  - Hinweis-Chip „Nur bargeldlos · Zahlung am Gast-Handy“.
  - KPIs: verkauft heute, Umsatz Abendkasse, offene Vorgänge.
  - Buttons „Kassenmodus öffnen ↗“ (neuer Tab) und „Kassen-QR drucken“ (ein Plakat-PDF A4 mit dem statischen Event-QR für die Selbstbedienung).
  - Liste der Verkäufe mit Zeit, Tickets, Betrag, Status.
- **Kassenmodus `/demo/kasse/<id>`** (Vollbild, für ein Tablet optimiert, dunkle Oberfläche optional):
  - Kopf mit Eventname, Uhrzeit, „Heute verkauft: 23 · 345,00 €“ und „Beenden“.
  - Große Kacheln je Abendkasse-Ticketart (Name, Preis, Rest), Plus/Minus.
  - Summe groß, Button „QR zum Bezahlen anzeigen“. Er legt einen `DashBoxOfficeSale` an und zeigt einen QR-Code (`TicketQrCode`) mit der URL `/demo/abendkasse/<eventId>?vorgang=<id>`, den Betrag und „Wartet auf Zahlung …“ (Spinner).
  - Sobald der Vorgang bezahlt ist (Synchronisation zwischen Tabs), erscheint ein Vollbild in Grün: „Bezahlt ✓ · 2 Tickets · eingecheckt“, nach 4 s zurück zum Start.
  - Optionen: „Abbrechen“; als Demo-Hilfe zusätzlich der Link „Gast-Ansicht öffnen ↗“ (öffnet die URL in einem neuen Tab).
  - Ohne aktive Abendkasse: Hinweisbildschirm.
- **Gast-Kaufseite `/demo/abendkasse/<id>`** (Mobil, Vollbild, im Stil eines Checkouts):
  - Event-Kopf (Bild, Titel, Org-Logo).
  - Mit `?vorgang=`: Positionen vorbelegt (nicht änderbar). Ohne: Auswahl der Abendkasse-Tickets (Selbstbedienung über den Plakat-QR).
  - Name (Pflicht) und E-Mail (für Ticket und Beleg).
  - Buttons „ Pay“ (schwarz) und „G Pay“ sowie „Karte“, jeweils als Simulation: 1 s Laden, dann bezahlt.
  - Erfolg: großes Ticket mit QR, „Du bist eingecheckt“, „Ticket per E-Mail gesendet“.
  - Ergebnis im Store: eine Bestellung (`channel: "abendkasse"`), Tickets mit `checkedInAt` und ein Scan mit `entrance: "Abendkasse"`.

### S14 Nachrichten (`…/nachrichten`)

- **Karte „Automatische Erinnerung“** (oben):
  - Schalter an/aus, „24 h vor Beginn“, Häkchen „Anfahrt“ und „Kalendereintrag (.ics)“.
  - Status „Geplant für Do., 17:00“ bzw. „Gesendet an 431“.
  - Button „Vorschau“ (E-Mail-Vorschau im Sheet).
- **Liste** der Nachrichten mit Betreff, Art-Pill (Info · Änderung · Absage), Empfänger, Status (Entwurf · Geplant · Gesendet) und Öffnungsrate.
- **Hauptaktion „Nachricht schreiben“** öffnet ein Sheet mit:
  - Vorlage-Chips: Info · Änderung · Absage (befüllen Betreff und Text).
  - Empfänger: Alle Ticketinhaber · Ticketarten … · Eingecheckt · Nicht eingecheckt, mit Live-Zähler „431 Empfänger“.
  - Betreff, Text (Markdown-Toolbar wie in S6), Platzhalter-Chips `{vorname}`, `{event}`, `{datum}`.
  - Rechts bzw. darunter eine E-Mail-Vorschau mit Org-Logo.
  - „Test an mich“, „Planen“ (Datum/Uhrzeit), „Jetzt senden“ (Bestätigung mit Empfängerzahl).
- **Absage:** zusätzlich die Checkbox „Alle Bestellungen erstatten“. Gemeinsam mit der Event-Absage wird alles erstattet und der Status `abgesagt` gesetzt.

### S15 Abrechnung (`…/abrechnung`)

- **Statuskarte:**
  - „Auszahlung geplant am 05.11.“ / „Bereit“ / „Ausgezahlt am … · Ref. …“.
  - Ziel: IBAN maskiert (`DE89 •••• 3000`), Link zu den Einstellungen.
- **Wasserfall** (vertikal, jede Zeile mit Icon und rechtsbündigem Betrag):
  1. Ticketumsatz brutto
  2. − Erstattungen
  3. − Rückbuchungen (+ Rückbuchungsgebühr)
  4. − Plattformgebühr (nur wenn der Veranstalter sie trägt)
  5. − Zahlungskosten
  6. = Auszahlung (fett, groß)
  - Zusätzlich: Info-Zeile „Servicegebühren der Käufer: 412,30 € (gehen an Eventoren)“ und „Davon über Gutscheine bezahlt: …“.
- **Tabellen:**
  - Nach Ticketart (verkauft, Brutto, Netto, USt).
  - Nach Steuersatz (7 % / 19 %; bei Kleinunternehmern „§ 19 UStG – keine USt“).
  - Nach Zahlart.
- **Downloads:** „Abrechnung (PDF)“ (jsPDF, A4, Kopf mit Org-Daten), „Positionen (CSV)“, „Provisionsrechnung (PDF)“ mit Badge „Lexware“ (nur visuell).
- **Rolle ohne `finanzen.sehen`:** Schloss-Zustand.

### S16 Protokoll (`…/protokoll` und Org-weit unter Einstellungen)

- Timeline gruppiert nach Tag:
  - Avatar mit Initialen, „Mara Lindner hat den Preis von Stehplatz · Phase 1 geändert“.
  - Vorher → Nachher als Diff-Chips (rot durchgestrichen → grün), relative Zeit.
- Filter-Chips nach Bereich (Preise · Kontingente · Codes · Bestellungen · Event · Team) und nach Person.
- Alle Aktionen des Stores schreiben Einträge (siehe Store).

### S17 Org-Bestellungen, Gutscheine, Finanzen

- **Bestellungen (Org):** wie S9 mit Eventfilter-Chip.
- **Gutscheine** (`/demo/dashboard/gutscheine`):
  - KPIs: Ausgegeben · Eingelöst · Offenes Guthaben.
  - Tabelle: Code, Empfänger, Wert, Restguthaben als Balken, Ablauf, Status.
  - **Hauptaktion „Gutschein erstellen“** (Sheet):
    - Wert (Chips 10/25/50 € + frei), Art (Verkauft | Kostenlos), Empfänger (Name, E-Mail), persönliche Nachricht.
    - Laufzeit als Chips: 1 Jahr · 2 Jahre · 3 Jahre zum Jahresende · Unbegrenzt · Datum (vorausgewählt ist der Standard aus den Einstellungen). Darunter „Gültig bis 31.12.2029“ bzw. „Unbegrenzt gültig“.
    - Vorschau der Gutschein-Karte im Org-Logo-Stil.
    - Danach „PDF herunterladen“ und „Per E-Mail senden“.
  - **Detail-Sheet:** Einlösungen (Bestellung, Betrag, Datum), „Laufzeit ändern“ (gleiche Chips), Deaktivieren.
  - Fester Hinweis-Chip: „Gilt nur für Events von {Org}“.
- **Finanzen** (`/demo/dashboard/finanzen`):
  - KPIs: Ausgezahlt (Jahr) · Nächste Auszahlung · Offen (laufende Events).
  - Tabelle der Auszahlungen: Event, Datum, Betrag, Status, Referenz, Abrechnung (PDF). Klick → Abrechnung des Events.
  - Karte „Gebührenmodell“ (nur lesen) und Bankkonto (maskiert, „Ändern“ mit Recht `bank.bearbeiten`).

### S18 Profil (`/demo/dashboard/profil`)

- Zweispaltig: links das Formular, rechts eine Live-Vorschau der öffentlichen Profilkarte (sticky), oben „Profil ansehen ↗“.
- **Felder:**
  - Logo-Upload: Drop-Zone, quadratischer Zuschnitt automatisch, Initialen als Fallback.
  - Name, Untertitel (max. 80), Beschreibung (Markdown-Toolbar, max. 1000).
  - Website, Kontakt-E-Mail, Telefon.
  - Social: Instagram, Facebook, TikTok, YouTube, X, LinkedIn, jeweils mit Marken-Icon und Präfix-Platzhalter (z. B. `instagram.com/`). Es reicht der Nutzername oder die URL. TikTok hat kein MDI-Icon, dafür ein eigenes kleines SVG in `src/dash/ui/`.
  - Profil-URL `eventoren.de/veranstalter/<slug>` mit Kopier-Button.
- **Anbieterangaben** (Impressum): Firmen- bzw. Vereinsname, Anschrift, vertreten durch, Registereintrag, USt-ID. Pflichtfelder sind markiert. Sie erscheinen auf dem öffentlichen Profil und auf der Eventseite unter „Veranstalter“.
- Speichern über die Sticky-Leiste.

### S19 Team (`/demo/dashboard/team`)

- **Tabelle:** Avatar, Name, E-Mail, Rolle (Select direkt in der Zeile, nur mit Recht `team.verwalten`), Status (Aktiv, Eingeladen mit „Erneut senden“), `⋯` Entfernen. Der letzte Inhaber kann nicht entfernt oder herabgestuft werden.
- **Hauptaktion „Mitglied einladen“:** E-Mail (mehrere möglich) und Rolle als Radio-Karten mit Icon und einer Zeile Beschreibung je Rolle.
- **Karte „Rollen & Rechte“:** Matrix Rollen × Bereiche mit ✓ / – (einklappbar).
- **Hinweis-Karte „Aushilfen am Einlass?“:** Scanner-Links funktionieren ohne Konto, Link zu Live-Einlass.

### S20 Einstellungen (`/demo/dashboard/einstellungen`)

- **Sektionen:**
  - **Organisation:** Name, Art, Slug.
  - **Auszahlung:** Kontoinhaber, IBAN mit Prüfung und Formatierung, Hinweis „Auszahlung nach Eventende“.
  - **Steuern** (nur lesen bis auf den Standard-Steuersatz für neue Ticketarten): Status vom Admin, Standardsatz 7 % oder 19 %.
  - **Gebühren** (nur lesen).
  - **Gutscheine:** Standard-Laufzeit (1 Jahr · 2 Jahre · 3 Jahre zum Jahresende · Unbegrenzt).
  - **Verträge:** AGB für Veranstalter und AVV, jeweils mit Datum und „Ansehen“ bzw. „PDF“.
  - **Protokoll:** organisationsweit, S16.
  - **Gefahrenzone:** Organisation löschen (nur Demo, mit Bestätigung).

### S21 Öffentliche Seiten (Vorschau)

- **Veranstalterprofil `/demo/customer/veranstalter/<slug>`** (im SiteFrame):
  - Header-Band mit Logo (96 px, rund), Name, Untertitel und Social-Icons als runde Icon-Buttons (neuer Tab), Website-Button, Kontakt.
  - Danach die Beschreibung (`DashMarkdown`).
  - Tabs „Kommende (n) | Vergangene“ mit Event-Karten im Stil der bestehenden Katalogkarten.
  - Unten die Anbieterangaben (aufklappbar).
  - Leer: „Gerade keine kommenden Events“ und „Vergangene ansehen“.
- **Event-Vorschau `/demo/customer/veranstalter/<slug>/<eventSlug>`:**
  - Nutzt die bestehende `EventDetailPageView` mit einem `EventItem`, das per Adapter (`dashEventToEventItem`) aus dem Store gebaut wird.
  - Neue optionale Props von `EventDetailPageView` und `EventDetailInfo`, rückwärtskompatibel ohne Verhaltensänderung, wenn sie fehlen:
    - `description?: JSX.Element` (gerendertes Markdown)
    - `faqs?: readonly EventFaqItem[]`
    - `schedule?: readonly EventScheduleItem[]`
    - `organizerCard?: JSX.Element` (Logo, Name, Untertitel, „Profil ansehen“)
  - Der Warenkorb ist ein lokaler Signal-Zustand. „Zur Kasse“ zeigt einen Toast „Vorschau – Kauf in der Demo nicht möglich“.
  - Bei Entwurf oder „nicht gelistet“ steht oben ein Banner: „Vorschau · Entwurf · nur für dich sichtbar“ mit „Zurück zum Dashboard“.
  - Phasen: Die aktive Phase bestimmt den Preis. Ist „Early Bird endet in …“ aktiv, zeigt der Tier-Text die Phase.
  - Versteckte Ticketarten erscheinen nicht. Ein Feld „Zugangscode?“ schaltet sie frei (validiert gegen die Codes im Store). Ein Rabattcode zeigt den rabattierten Preis.
- **Kundenkonto `/demo/customer/konto`** (im SiteFrame, angemeldet als Lea Schneider):
  - **Tabs:**
    - **Tickets:** kommende Tickets als Karten (Event-Bild, Datum, Ort, Ticketart, Inhaber, QR über `TicketQrCode`, „Ticket drucken“). Vergangene eingeklappt.
    - **Bestellungen:** Liste mit Nummer, Event, Datum, Betrag, Status. Detail mit Positionen, „Rechnung (PDF)“, Erstattungen.
    - **Profil:** Name, E-Mail, Passwort-Hinweis (nur Toast).
  - Ticket-Detail als Sheet (`?ticket=<id>`) mit großem QR und Helligkeitshinweis.
  - Leer: „Noch keine Tickets“ und „Events entdecken“.

### S22 Onboarding (`/demo/onboarding`, Vollbild)

- **Layout:**
  - Links ein schmaler Fortschritt (Desktop) mit 5 Schritten und Haken, rechts das Formular in einer Karte (max. 560 px).
  - Mobil steht der Fortschritt oben als „Schritt 2 von 5“ mit Balken.
- **Schritte:**
  1. **Konto:** Name, E-Mail, Passwort. Beim Klick auf „Weiter“ wird das Demo-Konto angelegt.
  2. **Organisation:** Art (Radio-Karten: Verein · Unternehmen · Schule/Abikomitee · Privatperson), Name, Slug (automatisch, bearbeitbar, live geprüft), Logo (optional).
  3. **Angaben:**
     - Anbieterangaben (wie in S18, je nach Art angepasst; Privatperson ohne Register).
     - Steuerstatus (Regelbesteuerung | Kleinunternehmer, ⓘ).
     - IBAN und Kontoinhaber (geprüft).
  4. **Verträge:** zwei Checkbox-Karten „AGB für Veranstalter“ und „Auftragsverarbeitungsvertrag (AVV)“, jeweils mit „Lesen“ (Sheet mit gekürztem Demotext) und Datum der Annahme.
  5. **Fertig:**
     - „Willkommen, {Org}!“ mit Status „In Prüfung – du kannst schon Events vorbereiten“.
     - Buttons „Erstes Event erstellen“ → Assistent und „Zum Dashboard“.
- Der Zustand wird bei jedem Schritt gespeichert (zurück und vor möglich). Das Ergebnis ist eine neue Organisation mit `status: "pruefung"` und dir als Inhaber; die Session wechselt dorthin.
- Im Dashboard steht bei Status `pruefung` ein Banner (Amber): „Deine Organisation wird geprüft. Veröffentlichen ist danach möglich.“ Der Admin kann sie freigeben (S23); dann verschwindet das Banner per Tab-Synchronisation sofort.

### S23 Admin (`/demo/admin/organisationen`, `…/<orgId>`, `/demo/admin/auszahlungen`)

- Im bestehenden Admin-Demo-Layout (SiteFrame + `DemoAdminNav`). Die Navigation bekommt „Organisationen“ (`mdiDomain`) und „Auszahlungen“ (`mdiBankTransfer`).
- **Organisationen:**
  - Status-Chips: In Prüfung (Zähler, Amber) · Aktiv · Gesperrt.
  - Tabelle: Logo, Name, Art, Inhaber, Events, Umsatz 30 Tage, Gebührenmodell, Status.
- **Detail:**
  - Kopf mit Logo, Name, Status und den Aktionen „Freigeben“ / „Sperren“ (Dialog mit Pflicht-Grund) / „Profil ansehen ↗“.
  - **Karten:**
    - **Gebührenmodell:** Prozent, Fix, Zahler; mit Beispielrechnung live.
    - **Steuern:** Status (Regel | Klein), Standardsatz.
    - **Angaben:** Impressum, IBAN (maskiert).
    - **Verträge:** Zeitpunkte der Annahme.
    - **Team:** Liste.
    - **Events:** Liste mit Status.
  - Änderungen landen im Protokoll mit Bereich `admin`.
- **Auszahlungen:**
  - Tabelle: Organisation, Event, Eventende, Betrag, Fälligkeit, Status.
  - Filter Bereit · Geplant · Ausgezahlt.
  - Aktion „Als ausgezahlt markieren“ (einzeln oder mehrfach; die Referenz wird erzeugt) und „SEPA-Datei exportieren“ (CSV, nur visuell).
  - Ein Klick öffnet die Abrechnung (gleiche Komponente wie S15, schreibgeschützt).

## Routendateien (`src/routes/demo/`)

- Bestehende Namenskonventionen gelten (`customer_.events_.$eventId.tsx`, `admin_.organizer_.event.$eventId.tsx`). Im Zweifel an diesen Dateien orientieren.
- Dashboard:
  - `dashboard.tsx` ist das Layout (`DashShell` + `<Outlet />`), `dashboard.index.tsx` die Übersicht.
  - `dashboard.events.index.tsx`, `dashboard.events.neu.tsx`.
  - `dashboard.events.$eventId.tsx` ist das Event-Layout (`DashEventLayout`: Event-Kopf, Fallback „Event nicht gefunden“, `<Outlet />`).
  - Darunter: `dashboard.events.$eventId.index.tsx`, `….details.tsx`, `….tickets.tsx`, `….codes.tsx`, `….bestellungen.tsx`, `….teilnehmer.tsx`, `….gaesteliste.tsx`, `….einlass.tsx`, `….abendkasse.tsx`, `….nachrichten.tsx`, `….abrechnung.tsx`, `….protokoll.tsx`.
  - `dashboard.bestellungen.tsx`, `dashboard.gutscheine.tsx`, `dashboard.finanzen.tsx`, `dashboard.profil.tsx`, `dashboard.team.tsx`, `dashboard.einstellungen.tsx`.
  - Der Assistent liegt außerhalb des Dashboard-Layouts: `dashboard_.events.neu.tsx` mit eigenem Vollbild-Rahmen (Fokus-Modus ohne Sidebar und Topbar, eigenes `ClientOnly`).
- Vollbild: `onboarding.tsx`, `kasse.$eventId.tsx`, `abendkasse.$eventId.tsx`.
- Öffentlich: `customer_.veranstalter_.$orgSlug.tsx`, `customer_.veranstalter_.$orgSlug_.$eventSlug.tsx`, `customer_.konto.tsx`.
- Admin: `admin_.organisationen.tsx`, `admin_.organisationen_.$orgId.tsx`, `admin_.auszahlungen.tsx`.
- Galerien: `ui-kit-basis.tsx`, `ui-kit-eingaben.tsx`, `ui-kit-overlays.tsx`, `ui-kit-menues.tsx`, `ui-kit-diagramme.tsx`, `ui-kit-tabelle.tsx`, `ui-kit-dash.tsx`.

## Aufgaben

Für alle Aufgaben gilt:
- Jede Aufgabe bekommt einen eigenen Subagenten und einen eigenen Commit. Wo im Abschnitt „Abhängig“ nichts steht, kann sie parallel zu anderen laufen.
- Die Akzeptanzkriterien beziehen sich auf die Spezifikationen S1–S23 und die UX-Regeln.

### Phase A – Fundament (parallel)

- **A1 Demo-Rahmen.**
  - Inhalt: Vollbild-Ausnahme in `DemoRouteShell`, `<Toaster />`, neue Präfixe statisch in `demoFlowRouteCapabilityResolve`, Verzeichnisgruppe „Veranstalter-Plattform“ mit Schnelleinstieg, Admin-Navigation, Platzhalter-Routen (ohne `ssr: false`).
  - Tests in `test/demo*` anpassen bzw. ergänzen.
  - Akzeptanz: `/demo/dashboard` rendert ohne SiteFrame, alle bestehenden Demo-Seiten sind unverändert, `bun test test/demo` ist grün.
- **A2 Modell-Schemas.**
  - Alle valibot-Schemas und Typen aus „Datenmodell“ (eine Datei je Schema) plus `dashStateSchema`.
  - Platzhalter `src/dash/store/seed/dashSeedCreate.ts` (gültiger, leerer Zustand).
  - Test: Ein minimaler Zustand wird akzeptiert, falsche Werte abgelehnt.
- **A3a UI-Anzeige** (`ui/`) mit Galerie `/demo/ui-kit-basis`:
  - Avatar (Initialen oder Bild)
  - ProgressBar
  - ProgressRing
  - EmptyState
  - Skeleton
  - Kbd
  - DotPill (Töne: neutral, brand, success, warning, danger, info)
  - StatCard (Icon, Label, Wert, Delta, Slot)
- **A3b UI-Eingaben** (`ui/`) mit Galerie `/demo/ui-kit-eingaben`:
  - FilterChip (mit Zähler)
  - CopyButton
  - SegmentedControl
  - ToggleSwitch (boolesch)
  - Stepper (horizontal und vertikal)
  - TabNav (mit Zähler)
- **A4a UI-Overlays** (`ui/`) mit Galerie `/demo/ui-kit-overlays`:
  - Sheet (rechts; mobil von unten; Breite sm/md/lg; Kopf, Inhalt, Fußleiste; `open` und `onOpenChange` gesteuert)
  - ConfirmDialog (Folgenliste, optional Eingabe zur Bestätigung)
  - StickySaveBar
- **A4b UI-Menüs** (`ui/`) mit Galerie `/demo/ui-kit-menues`:
  - DropdownMenu (Einträge mit Icon, Trenner, Gefahr-Eintrag, deaktiviert)
  - CommandPalette (Gruppen, Suche, Pfeiltasten, Enter, Kürzel ⌘K/Strg+K)
  - ImageDrop (Datei → verkleinerte Data-URL)
- Alle Overlays sind per Tastatur bedienbar und haben eine Fokusfalle.
- **A5 Diagramme** (`ui/`, SVG, ohne Bibliothek) mit Galerie `/demo/ui-kit-diagramme`:
  - AreaChart (Serie + Vergleich gestrichelt, Tooltip, vertikale Marker, responsiv)
  - Sparkline
  - BarChart (klein)
  - DonutChart
- **A6 DataTable** (`ui/`) mit Galerie `/demo/ui-kit-tabelle`:
  - Spaltendefinition mit Ausrichtung, Sticky-Kopf, Sortierung, Zeilenklick.
  - Mehrfachauswahl mit Aktionsleisten-Slot.
  - Mobil Karten-Rendering über eine Funktion je Zeile.
  - Leer-, Lade- und „Keine Treffer“-Zustand.
- **A7 Exporte** (`src/dash/export/`):
  - CSV (Semikolon, UTF-8-BOM)
  - XLSX (eigener Zip-Writer im Store-Modus mit CRC32, ohne Paket)
  - PDF-Tabelle (jsPDF lazy, A4 hoch/quer, Kopf, Seitenzahlen, optionale ☐-Spalte)
  - ICS
  - Download-Helfer, Dateinamen
  - `src/dash/model/dashSlugCreate.ts` (wird hier gebaut, nicht in B2)
  - Tests für CSV, ICS, Zip-Struktur und Slug.

### Phase B – Logik

- **B1 Rechenregeln** (nach A2): `dashFeeCompute`, `dashTaxCompute`, `dashPhaseResolve`, `dashTicketTypeSales`, `dashEventPhaseGet`, `dashDiscountCompute`, jeweils mit Tests.
- **B2 Helfer** (nach A2): `dashIbanValidate`, `dashIbanFormat`, `dashIbanMask`, `dashVoucherExpiry`, `dashCodeGenerate`, `dashCodeValidate`, `dashMarkdownParse`, `dashMarkdownToPlain`, jeweils mit Tests.
- **B3 Store** (nach A2): siehe „Store-API“, dazu `dashRolePermissions` und `dashRoleLabel`. Tests mit Fake-Storage und eigenem Mini-Zustand.
- **B4a Seed Stammdaten** (nach A2): ersetzt den Platzhalter `dashSeedCreate`. Enthält Nutzer, Organisationen, Mitglieder, Events, Ticketarten, Codes, Gutscheine, Vorlagen, Gästelisten-Kontingente, Scanner-Links und Nachrichten.
- **B5 Kennzahlen** (nach B1): `dashOrgStats`, `dashEventStats`, `dashSettlementCompute` mit Tests auf kleinen Fixtures.
- **B4b Seed Bestellungen** (nach B1, B4a, B5): Bestellungen und Tickets inklusive Code-Nutzung und Kundin Lea. Test: Bestände ≤ Kapazität, Summen stimmen.
- **B4c Seed Rest** (nach B4b):
  - Scans und Check-ins, Gäste, Abendkasse-Verkäufe, Auszahlungen (Betrag über `dashSettlementCompute`) und Protokoll.
  - Tests: Das Schema ist gültig, die festen IDs existieren.
  - „Testbestellungen erzeugen“ baut C3 über `dashOrderCreate`.
- **B6 Gemeinsame Aktionen** (nach B1, B3), unter `src/dash/store/actions/`, mit Tests:
  - `dashEventPatch(eventId, patch, audit)`
  - `dashTicketTypeUpsert(input)`, `dashTicketTypeDelete(id)`
  - `dashOrderCreate(input)` (berechnet Gebühren, Steuern und Summen über B1, erzeugt Tickets mit Codes und prüft Kontingente)
  - `dashTicketScan(eventId, code, entrance, device)` (gibt `DashScan` zurück und setzt bei Erfolg `checkedInAt`)
  - `dashTicketCheckIn(ticketId, entrance)`, `dashTicketCheckInUndo(ticketId)`
  - `dashOrderEmailLog(orderId, kind)`

### Store-API (B3, verbindlich für alle Seiten)

- **Fabrik und Zugriff** (eine Datei je Funktion unter `src/dash/store/`):
  - `dashStoreCreate({ storage, now, seed })`: testbare Fabrik.
  - `dashStoreGet()`: der Singleton, `dashStateGet()`: der reaktive Zustand (lazy, nur Client). Auf dem Server gibt es einen nicht persistierten Seed-Zustand.
  - `dashStoreUpdate(op, (draft) => void)` → `Result<void>`.
  - Selektoren gibt es zweimal: als `dashXyz(...)` (liest den Singleton) und als reine Variante `dashXyzIn(state, ...)` für Tests.
- **Hilfsfunktionen:**
  - `dashAuditAdd(draft, { orgId, eventId, area, action, before, after })`
  - `dashIdCreate(prefix)`
  - `dashNow()` (Accessor, tickt alle 30 s)
- **Selektoren:**
  - Session: `dashSessionUser()`, `dashUserOrgs()`, `dashActiveOrg()`, `dashActiveRole()`, `dashCan(permission)`
  - Daten: `dashOrgEvents(orgId)`, `dashEventById(id)`, `dashOrgBySlug(slug)`, `dashEventBySlugs(orgSlug, eventSlug)`
- **Session-Aktionen:** `dashSessionOrgSwitch(orgId)`, `dashSessionRoleSimulate(role | null)`, `dashStoreReset()`, `dashStoreResetEmpty()`.
- **Dateien:**
  - Jede Funktion liegt in einer eigenen Datei unter `src/dash/store/`.
  - Aktionen geben `Result<T>` zurück.
- **Platzhalter:** `src/dash/store/seed/dashSeedCreate.ts` legt A2 an (gültiger, leerer Zustand). B4a ersetzt den Inhalt.

### Vorhandene Aktionen (B6, `src/dash/store/actions/`)

- Alle Aktionen haben als letzten Parameter optional `store?: DashStore` für Tests.
- Sie prüfen keine Berechtigungen; das übernimmt die UI mit `dashCan(...)`.
- Vorhanden:
  - `dashEventPatch(eventId, patch, audit?)`
  - `dashTicketTypeUpsert(input)`, `dashTicketTypeDelete(id)` (`"geloescht"|"archiviert"`), `dashTicketTypeReorder(eventId, ids)`
  - `dashOrderCreate({ eventId, lines, buyer, holders?, channel, method, codeInput?, voucherCode?, checkIn? })`
  - `dashTicketScan(eventId, code, entrance, device)`, `dashTicketCheckIn(ticketId, entrance)`, `dashTicketCheckInUndo(ticketId)`
  - `dashOrderEmailLog(orderId, kind)`
- Seiten-spezifische Aktionen legen die D-Aufgaben unter `src/dash/store/actions/<ordner>/` an.
- **Bestellungen** (`actions/orders/`):
  - `dashOrderRefundableGet`, `dashOrderRefund({ orderId, mode: "tickets"|"betrag", ticketIds?, amountCents?, includeFee, invalidateTickets, reason })`, `dashOrderCancel({ orderId, reason })`
  - `dashOrderResend(orderId)`, `dashOrderBuyerUpdate`, `dashTicketHolderUpdate`
  - `dashOrderNoteAdd`, `dashOrderNoteDelete`, `dashOrderInvoicePdf(orderId)` (Promise)

### Vorhandene Bausteine (Stand Phase A–C)

- **`ui/` (über `#ui/...`):**
  - `static/`: `avatar/Avatar`, `progress/ProgressBar`, `progress/ProgressRing`, `empty/EmptyState`, `skeleton/Skeleton`, `kbd/Kbd`, `pill/DotPill`, `stat/StatCard`, `stepper/Stepper`
  - `interactive/`: `chip/FilterChip`, `copy/CopyButton`, `tabs/TabNav`, `sheet/Sheet`, `dialog/ConfirmDialog`, `savebar/StickySaveBar`, `menu/DropdownMenu`, `command/CommandPalette` (+ `commandPaletteShortcutRegister`)
  - `input/`: `segmented/SegmentedControl`, `toggle/ToggleSwitch`, `image/ImageDrop`
  - `table/data/DataTable` (+ `DataTableColumn`)
  - `chart/`: `AreaChart`, `BarChart`, `Sparkline`, `DonutChart`
- **`src/dash/ui/`:**
  - `DashPageHeader`
  - `shell/`: `DashShell` mit den Slots `orgSwitcher`, `eventSwitcher`, `onSearch`, `help`, `userMenu`, `actions`, `banner`
  - `status/DashStatusPill`
  - `markdown/DashMarkdown`, `markdown/DashMarkdownEditor`
  - `form/DashMoneyInput`, `form/DashDateTimeInput`
  - `time/DashRelativeTime`
  - `kpi/DashKpiCard`
  - `locked/DashLockedState`
  - `export/DashExportMenu` (+ `src/dash/export/dashTableExport`)
  - `org/DashOrgLogo`
  - `social/DashSocialLinks`, `social/DashSocialIcon`
  - `layout/DashSection`, `layout/DashField`, `layout/DashDescriptionList`
  - `money/DashMoney`
- **Formatierer** in `src/dash/model/`: `dashDateFormat`, `dashRelativeTimeFormat`, `dashCentsFormat`.
- Vor der Nutzung immer die Props in der Datei nachlesen.

### Event-Dialoge (C1c)

- `DashEventDialogsHost` (`src/dash/ui/event/dialogs/`) wird einmal in `DashEventLayout` eingebunden. Es öffnet die Dialoge über die Search-Params `veroeffentlichen`, `duplizieren`, `vorlage-speichern` und `absagen` (jeweils mit Wert `"1"`).
- Alle Event-Routen und die Layout-Route `dashboard.events.$eventId.tsx` lassen diese vier Parameter optional zu. Das gemeinsame valibot-Schema ist `src/dash/ui/event/dashEventDialogSearchSchema.ts`, die nachsichtige Prüfung (akzeptiert `"1"` und `1`) übernimmt `dashEventDialogSearchParse(raw)`.
- Eigene Parameter einer Unterseite werden so ergänzt: `validateSearch: (raw) => ({ ...dashEventDialogSearchParse(raw), ...eigeneParse(raw) })`.
- Aus Event-Listen heraus (S3) öffnen dieselben Dialoge über die Event-Übersicht mit gesetztem Parameter, z. B. `/demo/dashboard/events/<id>?duplizieren=1`.
- Zugehörige Aktionen: `dashEventDuplicate`, `dashTemplateCreateFromEvent`, `dashTemplateRename`, `dashTemplateDelete`, `dashEventPublish`, `dashEventSalesPause`, `dashEventCancel`. Dazu die reinen Funktionen `dashEventPublishCheck` und `dashEventShift`.

### Dateien je Seite (gegen Kollisionen bei paralleler Arbeit)

- **Eigene Dateien:** Jede D-Aufgabe legt nur neue Dateien an, und zwar in `src/dash/pages/<ordner>/` und `src/dash/store/actions/<ordner>/`. Den `<ordner>` gibt die Aufgabe vor. Seiten-spezifische reine Funktionen kommen nach `src/dash/pages/<ordner>/model/`, mit Tests.
- **Routendatei:** Dazu kommt nur die eigene Routendatei, deren Platzhalter ersetzt wird.
  - Search-Params werden mit valibot validiert.
  - Event-Routen übernehmen die Dialog-Parameter aus `dashEventDialogSearchSchema`.
  - Die Routendatei rendert nur die Seitenkomponente.
- **Gemeinsame Dateien:** `ui/`, `src/dash/ui/`, `src/dash/model/` und `src/dash/store/*.ts` ändern D-Aufgaben nicht. Wird dort ein Fehler gefunden, wird er gemeldet.
- **Arbeitsweise der Subagenten:**
  - Jede Antwort ohne Tool-Aufruf beendet den Auftrag.
  - Deshalb nur kurz erkunden, also höchstens die im Auftrag genannten Dateien lesen, dann sofort schreiben.
  - Den Abschlussbericht erst nach der Prüfung schicken.

### Phase C – Shell und gemeinsame Bausteine (nach A1, A3a, A3b, A4a, A4b, B3, B4a)

- **C1 Shell:**
  - Alle Routendateien als Platzhalter.
  - `DashShell` (S1: Sidebar, Drawer, Topbar mit Breadcrumb, mobile Tab-Leiste, Fokus-Modus).
  - Navigation nach Rolle, `DashPageHeader`.
  - `DashEventLayout` mit `DashEventHeader` und „nicht gefunden“-Zustand.
  - Platzhalter-Seiten mit PageHeader.
- **C2 Dash-Bausteine** (parallel zu C1) mit Galerie `/demo/ui-kit-dash`:
  - `DashStatusPill` (alle Status)
  - `DashMarkdown`, `DashMarkdownEditor` (Toolbar, Schreiben/Vorschau)
  - `DashMoneyInput`, `DashDateTimeInput` (Berlin)
  - `DashKpiCard` (StatCard + Link)
  - `DashLockedState`
  - `DashExportMenu`
  - `DashOrgLogo`
  - `DashSocialIcon` (inkl. TikTok-SVG)
- **C1b Event-Rahmen** (nach C1a): `DashEventLayout` mit Bannern und „nicht gefunden“, `DashEventHeader`, Platzhalter für alle Event-Unterseiten, Assistent-Route im Vollbild.
- **C1c Event-Aktionen** (nach B6, parallel zu C1b), unter `src/dash/store/actions/event/` und `src/dash/ui/event/`:
  - Aktionen: `dashEventDuplicate`, `dashTemplateCreateFromEvent`, `dashTemplateRename`, `dashTemplateDelete`, `dashEventPublish` (mit `dashEventPublishCheck`), `dashEventSalesPause`, `dashEventCancel`.
  - Dialoge: Duplizieren, Als Vorlage speichern, Veröffentlichen (Checkliste), Absagen.
  - Pfad-Helfer `dashEventPublicPath`.
- **C3 Shell-Menüs** (nach C1a):
  - Org-Wechsler, Event-Wechsler, Demo-Menü (inklusive „Testbestellungen erzeugen“ über `dashOrderCreate`), Benachrichtigungen, Nutzer-Menü, Befehlspalette, Banner „In Prüfung“.
  - Die Hilfe als Popover.

### Phase D – Seiten (nach C1–C3; Aufgaben parallel, jede mit Screenshots)

- **D1** Übersicht (S2).
- **D2** Events-Liste inklusive Duplizieren und Vorlagen (S3).
- **D3** Event-Assistent (S4).
- **D4** Event-Übersicht (S5).
- **D5** Event-Details: Formular mit Bild, Alt-Text, Sichtbarkeit und Absage (S6).
- **D6** Event-Details: Beschreibung, Ablauf und FAQ (S6).
- **D7** Tickets mit Phasen und Preisrechner (S7).
- **D8** Codes (S8).
- **D9** Bestellungen: Liste und Sheet ohne Dialoge (S9).
- **D10** Bestellungen: Erstatten, Stornieren, Umschreiben, Erneut senden, Notizen (S9).
- **D11** Teilnehmer und Exporte (S10).
- **D12** Gästeliste (S11).
- **D13** Live-Einlass mit Simulation und Scanner-Links (S12).
- **D14** Abendkasse im Dashboard (S13).
- **D15** Kassenmodus und Gast-Kaufseite (S13).
- **D16** Nachrichten und Erinnerung (S14).
- **D17** Abrechnung und Finanzen (S15, S17).
- **D18** Protokoll und Einstellungen (S16, S20).
- **D19** Gutscheine und Org-Bestellungen (S17).
- **D20** Profil (S18).
- **D21** Team (S19).
- **D22** Onboarding (S22).
- **D23** Öffentliches Profil (S21).
- **D24** Event-Vorschau inklusive der optionalen Props an `EventDetailPageView`, ohne Verhaltensänderung für bestehende Aufrufer (S21).
- **D25** Kundenkonto (S21).
- **D26** Admin: Organisationen und Detail (S23).
- **D27** Admin: Auszahlungen (S23).

### Phase E – Abschluss

- **E0 Store-Feinschliff:** Beim Verlassen oder Wegklicken der Seite (`pagehide`, `visibilitychange` → hidden) wird `flush()` aufgerufen, damit keine Änderung durch die Wartezeit von 400 ms verloren geht.
- **E0b Demo zurücksetzen auch auf Admin- und Käuferseiten:**
  - Im bestehenden Demo-Menü (DemoControls im SiteFrame) kommt der Eintrag „Plattform-Demo zurücksetzen“ dazu. Er ruft `dashStoreReset()` auf und lädt die Seite neu.
  - Der Reset darf nicht durch `pagehide`-Flush überschrieben werden: Nach einem Reset wird der zuletzt geflushte Stand verworfen, oder der Reset schreibt synchron.
- **E1 UX-Durchlauf:** Ein Browser-Subagent durchläuft alle Seiten auf Desktop und Mobil, hell und dunkel, als Inhaber, Finanzen und Einlass. Ergebnis ist eine Mängelliste.
- **E2 Korrekturen** (aus E1a, E1b und den Sichtprüfungen; gebündelt nach Dateibereich):
  - **E2-A1 Overlays:**
    - Ein Klick auf das Overlay schließt das Sheet.
    - Verschachtelte Dialoge im Sheet bleiben oben und schließen das Sheet nicht; Esc schließt nur die oberste Ebene.
    - Neuer `ui/interactive/dialog/ModalDialog` (zentriert, gesteuert, mit Fußleiste).
  - **E2-A2 Eingaben:**
    - `ToggleSwitch` in einer Zeile (Schalter links, Label rechts).
    - `CopyButton` (nur Icon) kompakt.
    - Tabellenköpfe in normaler Schreibweise, damit „USt“ nicht zu „UST“ wird.
    - `DashDateTimeInput` mit nativem Datum + Uhrzeit (15-Minuten-Schritt) statt der Liste mit 288 Uhrzeiten.
    - Eingabe in `DashMoneyInput` prüfen.
  - **E2-A3 Shell:** Abstand unten für die mobile Tab-Leiste; die Gruppe „Aktionen“ in der Befehlspalette fehlt.
  - **E2-D Finanzen:**
    - P1: Die Admin-Abrechnung zeigt „Kein Zugriff“.
    - Das Lexware-Badge braucht Abstand.
    - Der Gutschein-Hinweis erscheint doppelt.
  - **E2-E Kasse:** Grammatik bei offenen Vorgängen; `?vorgang` in der Kassen-URL, damit ein Reload den QR-Code wiederherstellt.
  - **E2-F Profil, Team, Gäste:**
    - Social-Präfix nur einmal, ein Prüfen-Link.
    - Rechtematrix mit sr-only-Text.
    - „Ticket gesendet“ und „Ticket senden“ einheitlich.
  - **E2-G Assistent, Einlass, Profil:**
    - Doppelte Gebührenzeile im Assistenten, kompakter Stepper.
    - Kürzerer Text bei „Letzte 15 Min“ im Einlass, Schalter in einer Zeile.
    - Ladezustand des öffentlichen Profils (Skeleton statt leerer Seite).
  - **Danach** (nutzen A1 und A2):
    - **E2-B Bestellungen:** Erstatten, Stornieren und Bearbeiten als `ModalDialog`, Leerzeichen in „€ erstatten“, Gründe als umbrechende Chips, Stornieren auch für offene Bestellungen.
    - **E2-C Nachrichten:** Vorschau ohne doppelte Begrüßung und Empfänger, Zielgruppe als Chips, Art-Pill nicht abschneiden, „–“ statt 0 Empfänger bei Entwürfen, Fußleiste entschlacken, wieder `ConfirmDialog` verwenden.
    - **E2-H Events-Liste:** Dialoge direkt auf der Liste öffnen (`DashEventDialogsHost` mit `?event=`).
    - **E2-I Codes:** Suffix „%“, Layout von „Gültig von/bis“.
  - **E2-K Tickets:** Die Preisphasen werden als Liste kompakter Karten bearbeitet statt als Tabelle (die Tabelle war mit Datum und Uhrzeit zu eng).
  - **E2-L Event-Dialoge:** Die Standardwerte erscheinen nicht. Im Dialog „Duplizieren“ fehlt das Datum (+7 Tage, gleiche Uhrzeit), im Dialog „Als Vorlage speichern“ der Name (Eventtitel). Die Initialisierung muss beim Öffnen reaktiv auf das Event erfolgen.
  - **Zuletzt:** **E2-J URL-Parameter:** Werte als Zahl setzen (`?mehrere=1`, `?schritt=2`); die Parser akzeptieren Zahl und String.
- **E2-M Nachrichten-Composer:** Der Refill-Effekt in `dashMessageSheetStateCreate.ts` darf nur beim Öffnen oder beim Wechsel der Nachricht feuern, nicht durch andere reaktive Änderungen (einmal sporadisch beobachtet, dass Felder zurückgesetzt wurden). Abhilfe: `on([open, messageId], …, { defer: false })` mit einem Vergleich gegen die zuletzt geladene ID.
- **E3 End-to-End-Szenarien** (Browser):
  1. Onboarding → Admin gibt frei → Event per Assistent → veröffentlichen → öffentliche Seite.
  2. Code erstellen → in der Vorschau anwenden.
  3. Abendkasse: Kassenmodus ↔ Gast-Tab → Einlass zählt hoch.
  4. Erstattung → Abrechnung ändert sich.
  5. Export-Dateien öffnen sich korrekt.
- **E4 Abschluss:**
  - Typecheck der neuen Dateien.
  - `bun test` für `src/dash`, `ui` (neue Tests) und `test/demo`.
  - `bun run shared-ui:check`, `bun run format:check` (nur neue Dateien).
  - `bun run build` einmal, um sicherzugehen, dass der Produktions-Build (inkl. SSR-Check) durchläuft.
  - AGENTS.md-Zeile wiederherstellen.
- **E5 Commits:** Skill `commits`: Änderungen in mehrere konventionelle Commits aufteilen (ohne die fremden API-Key-Dateien), dann pushen.
- **E6 Deploy:**
  - Produktion `eventoren.de` (Cloudflare Pages `eventoren`, SSR-Worker), ohne CI.
  - Weg: nur Frontend (`bun run frontend:deploy:production`). Die Vorprüfung ergab, dass sich seit dem letzten Produktions-Deploy (`1759e54`) unter `convex/` nichts geändert hat: kein Schema, keine neuen exportierten Funktionen, kein Frontend-Code ruft neue Backend-Funktionen auf. Die Demo läuft rein im Browser.
  - Die API-Key-Dateien (`src/auth/convex/apiKey/*`) sind mit `66cdcd0` in `main` gelandet. Sie sind in `convex/` nicht verdrahtet, und die Tabelle `authApiKeys` fehlt. Ein späterer Backend-Deploy ist erst sinnvoll, wenn das vollständig ist.
  - Danach `/demo/dashboard`, `/demo` und eine öffentliche Seite live prüfen.

## Status

- [x] A1 · [x] A2 · [x] A3a · [x] A3b · [x] A4a · [x] A4b · [x] A5a · [x] A5b · [x] A6 · [x] A7
- [x] B1 · [x] B2 · [x] B3 · [x] B4a · [x] B5 · [x] B4b · [x] B4c · [x] B6
- [x] C1a · [x] C1b · [x] C1c · [x] C2a · [x] C2b (Bausteine vorhanden, getestet, Galerie lädt) · [x] C3
- [x] C1d (Dialoge eingebunden)
- [x] D1 · [x] D1b · [x] D2 · [x] D3 · [x] D4 · [x] D5 · [x] D6 · [x] D11 · [x] D16 · [x] D17 · [x] D18 · [x] D19 · [x] D7 · [x] D8 · [x] D9 · [x] D10a · [x] D10b · [x] D12 · [x] D12b · [x] D13a · [x] D13b · [x] D14 · [x] D15 · [x] D15b (Tab-Sync) · [x] D19b (Org-Bestellungen geprüft) · [x] D20 · [x] D21 · [x] D23 · [x] D22 · [x] D24 · [x] D24b · [x] D25 · [x] D26 · [x] D27 · [x] F1 · [x] F2 (Footer) · [x] D11b
- Alle D-Aufgaben sind umgesetzt. Als Nächstes folgt E1 (UX-Durchlauf läuft).
- [x] P2 · [x] P1 (dashEventStats Indie 13,6 → 2,4 ms) · [x] T1 (Testfehler; Gutschein-Regel in `dashOrderCreate` korrigiert)
- Tests müssen gegen den Seed robust sein: Ergebnisse relativ zum Ausgangswert prüfen (`before + n`), Entitäten nach Kriterien aus dem Seed holen statt fest verdrahtet.
- E4 prüft das ganze Repo mit `bun run test`. Das schließt `convex-tests` und `e2e` aus; ein nacktes `bun test` meldet dort umgebungsbedingte Fehler.
- Baseline (18.10., auf HEAD ohne heutige Änderungen verglichen):
  - `bun run test` hat schon auf HEAD 46 Fehler und 2 Lade-Fehler (Convex-Client-Mocks, CDN-Erwartungen, Admin-Tiers, Logout, `@babel/core` fehlt, `getRouteApi` fehlt).
  - Die Liste der fehlschlagenden Tests ist identisch; es kommen keine neuen Fehler hinzu.
  - Die neuen Tests (+550) laufen alle grün.
- Offene Nacharbeiten:
  - Performance (P1 Modell-Indizes und P2 Memos laufen).
  - `DashMoneyInput` reagiert nicht auf Eingaben per Browser-Automation (D7 nutzt deshalb ein natives Feld), wird in E2 geprüft.
  - Einlass: Die Zeile „Letzte 15 Min“ braucht weniger Text, und der Live-Simulation-Schalter soll in einer Zeile mit dem Button stehen (E2).
  - D2: Der Duplizieren-Link wird als `?duplizieren=%221%22` kodiert (E2 prüfen).
  - D3: Im Schritt „Tickets“ steht die Gebührenzeile zweimal (im Kopf und unten mit falschem Icon `mdiEyeOff`). Nur eine Zeile behalten, mit `mdiCashMultiple`. Der Schalter „Versteckt“ soll eine Zeile mit Label rechts bilden (ToggleSwitch mit `label` und `description`). Der Stepper soll kompakter werden (E2).
  - D5: Nacharbeit D5b läuft (Button-Regel, Typfehler, überflüssiger Link „‹ Events“).
  - Kassenmodus: Die Sale-ID liegt nur im Speicher, nach einem Reload ist der wartende QR-Vorgang verloren. Der offene Vorgang soll in der URL stehen (`?vorgang=<id>`, E2).
  - D16 Nachrichten: `ConfirmDialog` wurde durch ein selbst gebautes Bottom-Sheet ersetzt (Klicks in Corvu-Portalen gingen im Test-Browser verloren). Das ist zu prüfen und wenn möglich wieder auf `ConfirmDialog` umzustellen, damit alle Seiten einheitlich sind (E2).
  - `Sheet` hat jetzt `closeOnOutsideFocus={false}` (D10b). Damit bleibt das Sheet offen, wenn daraus ein Dialog geöffnet wird. Das betrifft alle Sheets: Prüfen, dass Overlay-Klick und Esc weiterhin schließen (E1).
  - Hydration: C2b meldet, dass JSX-Element-Props (Slots) in `<Show>` oder Ternary-Bedingungen bei CSR-Hydration Fehler auslösen können. E1 prüft alle Seiten auf Hydration-Warnungen in der Konsole.
  - **E1b-Befunde:**
    - **P1 Admin-Auszahlungen:** Das Abrechnungs-Sheet zeigt „Kein Zugriff“. Die Rechteprüfung gehört in die Event-Route, nicht in `DashSettlementView`; mit `readOnly` (Admin) gibt es keine Rollenprüfung.
    - **P2 Kassenmodus:** „1 offene Vorgang“ ist grammatisch falsch → „1 offener Vorgang“ bzw. „2 offene Vorgänge“.
    - **P2 Veranstalterprofil Abikur:** Der erste Paint ist leer. Das Skeleton im `ClientOnly`-Fallback muss sichtbar sein (Hero, Karten).
  - `ToggleSwitch` (`ui/input/toggle`, neu von heute): Schalter und Label stehen untereinander, das wirkt unruhig (Erstatten-Dialog, Assistent, Tickets). Schalter links, Label und Beschreibung rechts daneben in einer Zeile.
  - Beträge in Button-Texten brauchen ein Leerzeichen: „56,00 €erstatten“ wird zu „56,00 € erstatten“.
  - `SegmentedControl` mit vielen oder langen Optionen läuft über (Grund im Erstatten-Dialog). Ab 4 Optionen FilterChips mit Umbruch verwenden.
  - Codes und Tabellen allgemein:
    - Icon-only-`CopyButton` und `ButtonIconOnly` sind in Tabellenzeilen zu groß (rund, p-2.5, Icon 24 px). In Tabellen eine kompakte Variante verwenden: `class="size-8 p-1.5"` mit Icon `size-4`.
    - Das Prozentfeld bekommt das Suffix „%“.
    - Die Uhrzeit-Auswahl in `DashDateTimeInput` wird in schmalen Spalten abgeschnitten („Uhr:“). Spalten im Sheet untereinander statt nebeneinander anordnen, wenn die Breite nicht reicht.
  - Search-Params: TanStack liest Werte als JSON, `?schritt=2` wird also zur Zahl. Alle Parser für `schritt`, `zeitraum` und die Dialog-Flags müssen Zahl und String annehmen. Beim Navigieren werden Zahlen gesetzt, damit die URLs lesbar bleiben (`?schritt=2` statt `?schritt=%222%22`). Betrifft Assistent, Onboarding, Übersicht und die Dialog-Flags (E2).
- [x] E4b Abschluss-Checks (Format, Typen, Regeln, Tests, Baseline) · [x] E4c (A11y der Kassenkacheln) · [x] AGENTS.md wiederhergestellt
- [x] E4a Produktions-Build (`bun run build` grün, SSR-Check ok, lokaler Pages-Smoke-Test 200). Offen: `shared-ui:check` in `DashKasseView.tsx` (E3-F2 behebt das), ein Chunk mit 518 kB (`organizerEventDetailPageStateCreate`).
- [x] E3 (6/6 Szenarien bestanden) · [x] E3-F1 (Reset-Wettlauf zwischen Tabs, Marker `resetAt`) · [x] E3-F2 (Kasse bei verdecktem Tab, Assistent Ende = Beginn + 3 h)
- [x] E5 Commits (`e47efc2`, `0070d86`, `6ced820`, `c87c4ac`, `7e64d97`, `697bc5d`, gepusht nach origin/main) · [x] E6 Frontend-Deploy Produktion (alle Live-Seiten 200)
- [x] E0 · [x] E0b · [x] E1 (E1a + E1b) · E2: [x] A1 · [x] A2 · [x] A3 · [x] D · [x] E · [x] F · [x] G · [x] B · [x] B2 · [x] C · [x] H · [x] I · [x] J · [x] K · [x] L · [x] M · [x] N · [] E2 · [] E3 · [] E4 · [] E5 · [] E6
