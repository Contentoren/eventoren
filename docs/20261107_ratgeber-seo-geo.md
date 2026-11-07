# Ratgeber & Guides: SEO/GEO content hub (DE + EN)

## Goal

Make eventoren.de the leading European source for event organisers selling tickets: ~91 in-depth, current (2026/2027) articles that beat the strongest competitors (ticket.io, Eventfrog, pretix, EVENTIM.Light, Eventbrite, Ticket Tailor, vivenu, Weezevent) on depth, accuracy and freshness, plus optimisation for generative engines (GEO). The homepage must not break.

## Decisions (fixed)

- **Two collections.** German `Ratgeber` at `/ratgeber/<slug>` (66 articles) and English `Guides` at `/en/guides/<slug>` (25 articles, British English, written for all of Europe, EUR). Each hub page lists its articles.
- **Hub headlines:**
  - DE H1: "Ratgeber für Veranstalter 2026/27: Tickets verkaufen, Einlass meistern, rechtssicher planen". Nav label: "Ratgeber".
  - EN H1: "Event Organiser Guides 2026/27: Sell Tickets, Run the Door, Stay Compliant in Europe".
- **Static output.** `/ratgeber`, `/ratgeber/<slug>`, `/en/guides` and `/en/guides/<slug>` are prerendered at build. TanStack Start prerender is limited to these paths: `autoStaticPathsDiscovery:false`, `crawlLinks:false`, `autoSubfolderIndex:false`, explicit `pages`. Output goes to `dist/client/ratgeber.html` and `dist/client/ratgeber/<slug>.html` (EN paths the same way). The Pages worker serves these assets before SSR and falls back to SSR when the asset is missing. All other routes stay SSR, and `dist/client/index.html` must not exist (`ssr:check`). Dev (`vite dev`) renders the same routes via SSR.
- **Markdown sources live outside `public/`.** DE files are in `content/ratgeber/` and EN files in `content/guides/`. Filenames are `2026-11-06-<slug>.md`. Set `contentDir === publicContentDir` so raw `.md` files are never served.
- **Extended frontmatter.** The pipeline strips unknown keys, so the project's own `contentCompile` reads `category`, `keywords`, `translationKey` and `seoTitle` itself. **Never run `content:clean`**: it strips these keys, and it gets guarded (T1).
- **Article HTML stays out of the client bundle.** The article route loader gets HTML, headings and FAQ through a server function. Index metadata such as titles and categories is small and may be in the client bundle.
- **SEO/GEO per article:**
  - JSON-LD: Article, BreadcrumbList, and FAQPage (from the `## Häufige Fragen` / `## Frequently asked questions` section).
  - hreflang de/en/x-default for pairs that share a `translationKey`.
  - An "Das Wichtigste in Kürze" / "Key takeaways" box, `Stand`/updated dates shown in Europe/Berlin, sources, and a `/llms.txt` generated at build.
- **Language.** `<html lang="en">` for paths under `/en/`, `de` everywhere else. `seoOutputCheck` checks lang per path. The site header and footer stay German, because the product is German-only. Article chrome (breadcrumbs, TOC, CTA, labels) follows the article language.
- **Navigation.** Add "Ratgeber" to the header nav and add "Ratgeber" and "English guides" to the footer. Add no other homepage changes.
- **Images.** Generated with `@adaptive-ds/codex-imagen@0.3.0` (devDependency, pinned), model `gpt-image-2`, gateway `CODEX_IMAGE_BASE_URL=https://codex.leonardomora.de/v1` with `CODEX_IMAGE_API_KEY=$CODEX_LB_API_TOKEN`. Newer CLI versions only allow models the gateway rejects.
  - Postprocess with `sharp` (cover-crop to 16:9, then 1920x1080 PNG) into `images/1920x1080_webp/<imageKey>.png`, with an alt sidecar `images/1920x1080_webp/<imageKey>.md`.
  - Upload via `bun run assets:upload`, then regenerate the catalog with `bun run assets:lists`. Articles resolve images via the `imageList` basename.
  - Prompts are committed in `src/app/content/image-prompts/<imageKey>.md`. The shared style lives in `src/app/content/image-prompts/_style.md`.
  - EN guides reuse the hero image of their DE pair, with English alt text.
- **Competitor comparisons are allowed.** They must be factual, dated "Stand: November 2026", link to the competitor's public pricing page, and name Eventoren's own limits too.
- **Contact FAQ.** Correct the false scanner-app claim in `src/contact/ContactFaqList.tsx`, plus any other claim not backed by code (T5).
- **AGENTS.md multi-surface rule (CLI/Hono/MCP).** Not applied, because these are static editorial pages with no domain data. This deviation is intended.

## Product facts: articles may ONLY claim these

- **Fee.** 3,9 % of the gross ticket price + 0,49 € per paid ticket, including VAT and payment processing. No base fee, no minimum revenue, no minimum term (cancel anytime). Free tickets cost nothing. The organisation decides at onboarding whether buyers or the organiser pay the fee.
- **Checkout and delivery.** Buyers check out as guests, with no account required. Tickets arrive by email as a PDF with a QR code. The customer account shows tickets, orders and invoices. Each ticket has a participant name, which the organiser can edit.
- **Ticket setup.** Ticket types (Ticketstufen) each have their own capacity (Kontingent) and a max-per-order limit (default 10, the organiser sets it per ticket type).
  - **Freischaltcodes.** The organiser marks a ticket type "nur mit Freischaltcode". On request, the Eventoren team generates one-time codes in bulk (8 random characters, up to 500 per run) and hands them over as a CSV/PDF list. There is NO custom prefix such as "ABI-".
    - Each code is bound to one ticket type and unlocks ONE order, up to that type's max-per-order. It is held for 15 minutes during checkout and consumed once payment completes.
    - Typical use: one code per Abiturient or member, with max-per-order set to the guest allowance.
    - Do NOT claim self-service code generation, prefixes, per-code quantities or expiry dates.
  - **Early bird** is done with a separate, limited ticket type (e.g. "Early Bird – 100 Stück"). Do NOT claim automatic price phases.
- **Entry.** Shareable scanner links let helpers scan with the smartphone browser camera; manual code entry also works. No app install is needed, but it needs internet. Check-in stats per entrance and ticket type; rejected scans show the reason.
- **Abendkasse.** Cashless: the guest pays on their own phone via the box-office QR poster, and there are separate box-office prices. No cash register, no card terminal.
- **Gästeliste.** Supports quotas, 0–5 Begleitpersonen, check-in and free guest tickets. Do NOT claim automatic email delivery of guest tickets.
- **Team, exports, payout.**
  - Team roles: Inhaber, Admin, Eventmanager, Finanzen, Einlass.
  - Exports: CSV, XLSX, PDF, ICS.
  - Payout by bank transfer to the organiser's IBAN, at the latest on the 7th bank working day after the event ends.
- **Organiser types and approval.** Verein, Unternehmen, Schule, Privatperson. The organisation is checked and approved before sales start.
- **Public event pages** (`/events/<id>`) carry schema.org Event structured data. API keys and an HTTP API are available for organisers.
- **Payment methods for buyers.** Card (Visa, Mastercard, Maestro, American Express); Apple Pay and Google Pay where the device supports them; Klarna; SEPA direct debit; Bancontact.
- **Market and company.** EUR only, German interface. Operator: Semesterkur UG (haftungsbeschränkt), Köln.
- **NEVER claim:**
  - native app, offline scanning, Apple or Google Wallet passes
  - seat maps, waitlist, private or unlisted events
  - voucher or discount-code redemption at checkout, automatic price phases
  - ticket transfer or resale feature, automatic reminder emails
  - EU/German hosting, PayPal, iDEAL, Wero as a payment method
  - multi-currency, cash box office
  - user numbers, testimonials, case studies

## Article format (all articles)

Frontmatter (YAML, quoted strings):

```yaml
---
title: "H1 title, ≤ 70 chars, main keyword first, year if time-sensitive"
seoTitle: "optional, ≤ 55 chars, used for <title> (template appends ' | Eventoren')"
description: "130–160 chars, answer-first, contains main keyword"
publishedAt: "2026-11-06"
slug: "tickets-online-verkaufen"
author: "Eventoren Redaktion" # EN: "Eventoren Editorial Team"
image: "ratgeber-tickets-online-verkaufen" # EN: reuse DE pair's key
imageAlt: "Concrete description of the hero image in article language"
category: "tickets-verkaufen" # id from category list below
keywords: ["primary keyword", "secondary", "..."] # 4–10
translationKey: "sell-tickets-online" # only when listed in the tables
---
```
Body rules:

- **Opening and summary box.** Start with an answer-first intro of 2–4 sentences. Follow it with a blockquote box `> **Das Wichtigste in Kürze**` (EN: `> **Key takeaways**`) containing 4–6 bullets.
- **Headings.** No H1 in the body. Use 6–12 `##` sections (they form the TOC) and `###` subsections. Use GFM tables and checklists (`- [ ]`). No raw HTML, no images in the body, no emojis.
- **Length.** DE 1.800–3.000 words, EN 1.500–2.500 words. Every article contains:
  - at least one table or checklist
  - a worked example with real numbers where it fits (fees, break-even, costs)
  - 2026/2027 specifics with "Stand: November 2026" next to time-sensitive figures
- **Eventoren section.** One section `## So setzt du das mit Eventoren um` (EN: `## How to do this with Eventoren`), 120–250 words, using only the facts listed above. Buyer articles use a neutral "Tickets bei Eventoren" note instead.
- **FAQ.** A `## Häufige Fragen` section (EN: `## Frequently asked questions`) with 4–6 `### Question?` entries, each followed by a 2–4 sentence answer paragraph.
- **Sources.** A `## Quellen` section (EN: `## Sources`) listing ≥ 3 authoritative sources (laws, authorities, GEMA/KSK/BMF/BMAS/EU, competitor pricing pages) as full https links. Facts come from the fact-base docs or from sources fetched yourself. Never invent statistics, quotes, studies or survey numbers. Mark estimates as "Beispielrechnung" / "example".
- **Legal and tax articles** add one line: "Dieser Artikel ersetzt keine Rechts- oder Steuerberatung." (EN: "This guide is not legal or tax advice.")
- **Internal links.** 3–8 per article, only to slugs in the tables below (`/ratgeber/<slug>`, `/en/guides/<slug>`) and to `/kontakt` (organiser contact) or `/` (events). Never link to `/veranstalter*`, `/demo*` or `/abiball-2027`.
- **Tone.**
  - DE: Du-Form, concrete and practical. No filler or AI clichés ("In der heutigen schnelllebigen Welt", "Fazit: Es kommt darauf an").
  - EN: British English, "you". Europe-wide angle with country examples (DE, AT, NL, BE, FR, IE, ES, IT, PL; UK where relevant). Not literal translations of the DE articles.
- **Fact bases:** `docs/20261107_ratgeber-facts-de.md` (DE law/tax/figures 2026–2027) and `docs/20261107_ratgeber-facts-competitors-eu.md` (competitor fees and EU rules).

Image prompt file per DE article, `src/app/content/image-prompts/<imageKey>.md` (EN articles reuse it; add the EN path to `articles`):

```markdown
---
imageKey: "ratgeber-<slug>"
articles: ["/ratgeber/<slug>"]
alt: "German alt text (same as frontmatter imageAlt)"
---

<Scene description only, 2–5 sentences: who/what/where, moment, composition. No style words, no text/logos.>
```

## Categories

- DE ids → labels:
  - `tickets-verkaufen` → Tickets verkaufen
  - `einlass-event-tag` → Einlass & Event-Tag
  - `recht-steuern` → Recht & Steuern
  - `abiball` → Abiball
  - `vereine-schulen` → Vereine & Schulen
  - `eventformate` → Eventformate
  - `planung-marketing` → Planung & Marketing
  - `ticketkaeufer` → Für Ticketkäufer
- EN ids → labels:
  - `selling-tickets` → Selling tickets
  - `on-the-day` → On the day
  - `law-tax` → Law & tax
  - `event-types` → Event types
  - `planning-marketing` → Planning & marketing
  - `for-ticket-buyers` → For ticket buyers

## German articles (`content/ratgeber/2026-11-06-<slug>.md`, image key `ratgeber-<slug>`)

| #   | slug                                        | working title                                                       | category          | main keywords                                                                          | translationKey           |
| --- | ------------------------------------------- | ------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------- | ------------------------ |
| D01 | tickets-online-verkaufen                    | Tickets online verkaufen 2026: Der Leitfaden für Veranstalter       | tickets-verkaufen | tickets online verkaufen, tickets verkaufen als veranstalter, eigene tickets verkaufen | sell-tickets-online      |
| D02 | ticketing-anbieter-vergleich                | Ticketing-Anbieter im Vergleich 2026/27: Gebühren & Funktionen      | tickets-verkaufen | ticketsystem vergleich, tickets online verkaufen vergleich, ticketgebühren vergleich   | ticketing-fees-compared  |
| D03 | eventbrite-alternative                      | Eventbrite-Alternativen 2026 für Veranstalter in Deutschland        | tickets-verkaufen | eventbrite alternative, eventbrite gebühren, eventbrite seriös                         | eventbrite-alternatives  |
| D04 | eventim-light-pretix-ticket-io-alternativen | EVENTIM.Light, pretix, ticket i/O & Co.: Kosten und Alternativen    | tickets-verkaufen | eventim light kosten, pretix kosten, ticket i/o gebühren                               | –                        |
| D05 | ticketgebuehren                             | Ticketgebühren 2026: Was Ticketing kostet und wer zahlt             | tickets-verkaufen | ticketgebühren, servicegebühr tickets, gebühr weitergeben, endpreis PAngV              | –                        |
| D06 | ticketpreis-kalkulieren                     | Ticketpreis kalkulieren: Break-even und Preisstufen mit Beispiel    | tickets-verkaufen | ticketpreis berechnen, eintrittspreis kalkulieren                                      | price-event-tickets      |
| D07 | early-bird-tickets                          | Early-Bird-Tickets: Preisstufen, die den Vorverkauf starten         | tickets-verkaufen | early bird tickets, early bird bedeutung, preisstufen                                  | early-bird-tickets       |
| D08 | dynamic-pricing-tickets                     | Dynamic Pricing bei Tickets: Was 2026/2027 in der EU gilt           | tickets-verkaufen | dynamic pricing tickets, digital fairness act, drip pricing                            | dynamic-pricing          |
| D09 | ticketshop-erstellen                        | Ticketshop erstellen: In 10 Schritten zum eigenen Vorverkauf        | tickets-verkaufen | ticketshop erstellen, ticketshop online, tickets erstellen und verkaufen               | –                        |
| D10 | kostenlose-events-anmeldung                 | Kostenlose Events: Gratis-Tickets, Anmeldung und No-Shows senken    | tickets-verkaufen | kostenlose tickets erstellen, anmeldung veranstaltung, no-show quote                   | –                        |
| D11 | vorverkauf-steigern                         | Vorverkauf ankurbeln: 25 Hebel gegen Last-Minute-Käufe              | tickets-verkaufen | vorverkauf steigern, mehr tickets verkaufen, event ausverkauft                         | –                        |
| D12 | eintrittskarten-erstellen                   | Eintrittskarten erstellen: Digital mit QR-Code statt Word-Vorlage   | tickets-verkaufen | eintrittskarten erstellen, eintrittskarten mit qr code, eintrittskarten nummeriert     | –                        |
| D13 | ticketarten                                 | Ticketarten erklärt: VIP, ermäßigt, Gruppe, Freikarte & Co.         | tickets-verkaufen | ticketkategorien, ticketarten, ermäßigte tickets, gruppenticket                        | –                        |
| D14 | freischaltcodes-presale                     | Presale- und Freischaltcodes: Exklusiver Vorverkauf richtig gemacht | tickets-verkaufen | presale code, freischaltcode, vorverkauf für mitglieder                                | presale-codes            |
| D15 | zahlungsarten-ticketshop                    | Zahlungsarten im Ticketshop 2026: Karte, Klarna, SEPA, Wero         | tickets-verkaufen | tickets verkaufen paypal, tickets klarna, zahlungsmethoden ticketshop, wero            | payment-methods-europe   |
| D16 | einlasskontrolle-qr-code                    | Einlasskontrolle mit QR-Code: Ablauf, Technik, Personal             | einlass-event-tag | einlasskontrolle qr code, ticket scanner app, einlass scannen                          | qr-check-in              |
| D17 | einlassmanagement-warteschlangen            | Einlassmanagement: Warteschlangen berechnen und vermeiden           | einlass-event-tag | einlassmanagement, einlass planen, durchsatz einlass                                   | entry-queues             |
| D18 | abendkasse-organisieren                     | Abendkasse 2026: Bargeldlos, Kassenpflicht und Ablauf               | einlass-event-tag | abendkasse, tageskasse, kassensicherungsverordnung, kasse meldepflicht                 | box-office               |
| D19 | gaesteliste-vorlage                         | Gästeliste führen: Vorlage, Begleitpersonen und Einlass             | einlass-event-tag | gästeliste vorlage, gästeliste party, gästeliste einlass                               | guest-list               |
| D20 | ticketbetrug-verhindern                     | Ticketbetrug verhindern: Fake-Tickets und Doppelscans stoppen       | einlass-event-tag | fake tickets veranstalter, ticketbetrug, gefälschte tickets                            | –                        |
| D21 | personalisierte-tickets                     | Personalisierte Tickets: Wann sinnvoll, was rechtlich gilt          | einlass-event-tag | tickets personalisiert, umpersonalisieren, tickets mit namen                           | –                        |
| D22 | sicherheitskonzept-veranstaltung            | Sicherheitskonzept für Veranstaltungen: Pflicht, Inhalte, Ordner    | einlass-event-tag | sicherheitskonzept veranstaltung, ordnerdienst, versammlungsstättenverordnung          | –                        |
| D23 | gema-veranstaltung                          | GEMA für Veranstaltungen 2026: Anmeldung, Tarife, Kosten            | recht-steuern     | gema veranstaltung anmelden, gema kosten, gema ohne eintritt                           | –                        |
| D24 | kuenstlersozialabgabe                       | Künstlersozialabgabe 2026 und 2027: Was Veranstalter zahlen         | recht-steuern     | künstlersozialabgabe 2026, künstlersozialabgabe 2027, ksk veranstalter                 | –                        |
| D25 | umsatzsteuer-eintrittskarten                | Umsatzsteuer auf Eintrittskarten 2026: 7 %, 19 % oder frei?         | recht-steuern     | umsatzsteuer eintrittskarten, mwst konzert, verein eintritt umsatzsteuer               | vat-event-tickets        |
| D26 | kleinunternehmerregelung-veranstalter       | Kleinunternehmerregelung für Veranstalter 2026/2027                 | recht-steuern     | kleinunternehmer veranstaltung, umsatzgrenze 25000, party steuer                       | –                        |
| D27 | e-rechnung-veranstalter                     | E-Rechnungspflicht 2027: Was Veranstalter jetzt tun müssen          | recht-steuern     | e-rechnung 2027, xrechnung, zugferd veranstalter                                       | e-invoicing              |
| D28 | barrierefreiheit-bfsg                       | Barrierefreie Veranstaltung und BFSG: Ticketshop barrierefrei       | recht-steuern     | bfsg ticketshop, barrierefreie veranstaltung, barrierefreiheitsstärkungsgesetz         | accessibility-act        |
| D29 | widerrufsrecht-tickets                      | Widerrufsrecht bei Tickets: Was 2026 gilt                           | recht-steuern     | widerrufsrecht tickets, tickets zurückgeben, ticket stornieren                         | –                        |
| D30 | veranstaltung-absagen                       | Veranstaltung absagen oder verschieben: Erstattung und Vorlage      | recht-steuern     | event absagen vorlage, veranstaltung abgesagt geld zurück, verschiebung                | cancellation-refunds     |
| D31 | veranstalterhaftpflicht                     | Veranstalterhaftpflicht 2026: Wann nötig, was sie kostet            | recht-steuern     | veranstalterhaftpflichtversicherung, einmalig, verein                                  | –                        |
| D32 | veranstaltung-anmelden-genehmigung          | Veranstaltung anmelden: Ordnungsamt, Ausschank, Sperrzeit           | recht-steuern     | veranstaltung anmelden ordnungsamt, gestattung ausschank, sperrstunde                  | –                        |
| D33 | jugendschutz-party                          | Jugendschutz auf Partys: Muttizettel, Altersgrenzen, Einlass        | recht-steuern     | muttizettel, party ab 16, jugendschutz veranstaltung                                   | –                        |
| D34 | helfer-minijob-ehrenamt                     | Helfer bezahlen 2026/2027: Mindestlohn, Minijob, Pauschalen         | recht-steuern     | mindestlohn 2026, mindestlohn 2027, ehrenamtspauschale, übungsleiterpauschale          | –                        |
| D35 | dsgvo-veranstalter                          | DSGVO für Veranstalter: Teilnehmerdaten, Fotos, Newsletter          | recht-steuern     | dsgvo veranstaltung, fotos veranstaltung dsgvo, teilnehmerdaten                        | gdpr                     |
| D36 | agb-ticketverkauf                           | AGB für den Ticketverkauf: Diese Klauseln brauchen Veranstalter     | recht-steuern     | agb veranstalter, agb ticketverkauf, hausrecht veranstaltung                           | –                        |
| D37 | abiball-planen-checkliste                   | Abiball planen 2027: Checkliste und Zeitplan Monat für Monat        | abiball           | abiball planen checkliste, abiball ablauf, abiball 2027                                | –                        |
| D38 | abiball-kosten                              | Abiball-Kosten 2026/2027: Kalkulation pro Person mit Beispiel       | abiball           | abiball kosten, abiball kosten pro person, abiball tickets preis                       | –                        |
| D39 | abiball-tickets-online-verkaufen            | Abiball-Tickets online verkaufen: Codes, Kontingente, Einlass       | abiball           | abiball tickets verkaufen, abiball qr code, abiball tickets                            | –                        |
| D40 | abiball-veranstalter-haftung                | Wer ist Veranstalter beim Abiball? Haftung, Verträge, GEMA          | abiball           | abiball veranstalter, abiball gema, abiball öffentliche veranstaltung                  | –                        |
| D41 | abiball-finanzieren-sponsoren               | Abiball finanzieren: Sponsoren, Aktionen und Abikasse               | abiball           | abiball sponsoren, abikasse, abiball finanzieren                                       | –                        |
| D42 | abiball-location-catering                   | Abiball-Location und Catering: Auswahl, Verträge, Preise            | abiball           | abiball location, abiball catering kosten, abiball dj                                  | –                        |
| D43 | ticketing-verein                            | Ticketing für Vereine: Mitgliederpreise, Steuern, Helfer            | vereine-schulen   | ticketsystem verein, tickets online verkaufen verein, vereinsveranstaltung             | –                        |
| D44 | vereinsfest-organisieren                    | Vereinsfest organisieren: Checkliste, Genehmigung, Finanzen         | vereine-schulen   | vereinsfest organisieren, vereinsfest ideen, sommerfest verein                         | –                        |
| D45 | schulveranstaltung-tickets                  | Tickets für Schulveranstaltungen: Theater, Konzert, Schulfest       | vereine-schulen   | schultheater tickets, schulkonzert karten, förderverein tickets                        | –                        |
| D46 | benefizveranstaltung                        | Benefizveranstaltung organisieren: Tickets, Spenden, Steuern        | vereine-schulen   | benefizveranstaltung organisieren, spendenquittung eintritt, charity event             | charity-events           |
| D47 | sportveranstaltung-turnier                  | Sportturnier organisieren: Tickets, Startgeld und Einlass           | vereine-schulen   | fußballturnier organisieren, sportveranstaltung tickets, startgeld                     | –                        |
| D48 | party-veranstalten                          | Party veranstalten 2026: Von der Location bis zur Abrechnung        | eventformate      | party veranstalten, party veranstalten was beachten, party organisieren                | –                        |
| D49 | clubnacht-veranstalten                      | Clubnacht veranstalten: Deal mit dem Club, Vorverkauf, Gästeliste   | eventformate      | club tickets verkaufen, partyreihe starten, promoter club                              | club-night               |
| D50 | konzert-veranstalten                        | Konzert veranstalten: Kalkulation, Booking, GEMA, Tickets           | eventformate      | konzert veranstalten, konzert veranstalten kosten, kleines konzert                     | –                        |
| D51 | festival-organisieren                       | Festival organisieren 2027: Zeitplan, Budget, Genehmigungen         | eventformate      | festival organisieren, festival organisieren checkliste, festival kosten               | organise-festival        |
| D52 | firmenevent-konferenz-tickets               | Firmenevents und Konferenzen: Tickets, Rechnungen, Steuern          | eventformate      | konferenz tickets, firmenevent anmeldung, betriebsveranstaltung 110 euro               | –                        |
| D53 | karneval-2027                               | Karneval 2027: Sitzungen und Partys planen, Tickets verkaufen       | eventformate      | karneval 2027 termine, karnevalssitzung tickets, rosenmontag 2027                      | –                        |
| D54 | silvesterparty-2026                         | Silvesterparty 2026 veranstalten: Planung, Tickets, Sicherheit      | eventformate      | silvesterparty veranstalten, silvester 2026 party, silvester tickets                   | –                        |
| D55 | weihnachtsfeier-adventsveranstaltung        | Weihnachtsfeier und Adventsevent 2026 mit Tickets planen            | eventformate      | weihnachtsfeier planen, adventskonzert tickets, weihnachtsmarkt organisieren           | –                        |
| D56 | lesung-comedy-kleinkunst                    | Lesung, Comedy, Kleinkunst: Kleine Events profitabel planen         | eventformate      | lesung veranstalten, comedy abend organisieren, kleinkunstbühne                        | –                        |
| D57 | veranstaltung-planen-checkliste             | Veranstaltung planen: Checkliste 2026 mit Zeitplan                  | planung-marketing | veranstaltung planen checkliste, event planen, eventplanung                            | event-planning-checklist |
| D58 | eventbudget-planen                          | Eventbudget planen: Kostenpositionen, Puffer, Vorlage               | planung-marketing | eventbudget, kalkulation veranstaltung, event kosten planen                            | event-budget             |
| D59 | event-marketing                             | Event-Marketing 2026: Instagram, TikTok, WhatsApp, Newsletter       | planung-marketing | event bewerben, veranstaltung bewerben, event marketing                                | –                        |
| D60 | event-sichtbar-google-ki                    | Event bei Google und KI-Assistenten sichtbar machen                 | planung-marketing | event bei google eintragen, veranstaltung google, strukturierte daten event            | event-seo-ai             |
| D61 | sponsoren-finden                            | Sponsoren für Events finden: Pakete, Pitch, Gegenleistung           | planung-marketing | sponsoren finden veranstaltung, sponsoring paket, sponsorenmappe                       | –                        |
| D62 | eventlocation-finden                        | Eventlocation finden und mieten: Checkliste Mietvertrag             | planung-marketing | location mieten veranstaltung, eventlocation finden, mietvertrag location              | –                        |
| D63 | ticketing-glossar                           | Ticketing-Glossar: 70 Begriffe von Abendkasse bis Zweitmarkt        | planung-marketing | ticketing begriffe, kontingent bedeutung, abendkasse bedeutung                         | –                        |
| D64 | tickets-weiterverkaufen                     | Tickets weiterverkaufen 2026: Was ist erlaubt?                      | ticketkaeufer     | ticket weiterverkaufen legal, tickets privat verkaufen, ticket teurer verkaufen        | ticket-resale            |
| D65 | e-ticket-hilfe                              | E-Ticket nicht angekommen oder verloren? So hilfst du dir           | ticketkaeufer     | e-ticket nicht erhalten, ticket verloren, qr code ticket screenshot                    | –                        |
| D66 | fake-tickets-erkennen                       | Fake-Tickets erkennen: So kaufst du Tickets sicher                  | ticketkaeufer     | fake tickets erkennen, tickets sicher kaufen, ticketbetrug                             | fake-tickets             |

## English guides (`content/guides/2026-11-06-<slug>.md`, image = DE pair's key)

| #   | slug                                 | working title                                          | category           | main keywords                                                      | translationKey (DE pair)       |
| --- | ------------------------------------ | ------------------------------------------------------ | ------------------ | ------------------------------------------------------------------ | ------------------------------ |
| E01 | sell-tickets-online                  | How to Sell Tickets Online in Europe: 2026 Guide       | selling-tickets    | sell tickets online, sell event tickets online, ticketing platform | sell-tickets-online (D01)      |
| E02 | ticketing-platforms-fees-compared    | Ticketing Platforms in Europe Compared: Fees 2026/27   | selling-tickets    | ticketing platform comparison, ticketing fees, eventbrite fees     | ticketing-fees-compared (D02)  |
| E03 | eventbrite-alternatives-europe       | Eventbrite Alternatives in Europe (2026)               | selling-tickets    | eventbrite alternatives, eventbrite alternative europe, germany    | eventbrite-alternatives (D03)  |
| E04 | how-to-price-event-tickets           | How to Price Event Tickets: Break-even and Tiers       | selling-tickets    | how to price event tickets, ticket pricing strategy                | price-event-tickets (D06)      |
| E05 | early-bird-tickets                   | Early Bird Tickets: Tier Strategies That Work          | selling-tickets    | early bird tickets, early bird meaning, ticket tiers               | early-bird-tickets (D07)       |
| E06 | dynamic-pricing-tickets-eu           | Dynamic Ticket Pricing and the EU Digital Fairness Act | selling-tickets    | dynamic pricing tickets europe, digital fairness act, drip pricing | dynamic-pricing (D08)          |
| E07 | qr-code-ticket-check-in              | QR Code Ticket Check-in Without an App                 | on-the-day         | event check in qr code, ticket scanner, check in system            | qr-check-in (D16)              |
| E08 | event-entry-queue-management         | Event Entry Management: Calculate and Cut Queues       | on-the-day         | event entry management, queue management events                    | entry-queues (D17)             |
| E09 | box-office-door-sales                | Box Office and Door Sales: A Cashless Setup Guide      | on-the-day         | box office, door sales event, cashless event                       | box-office (D18)               |
| E10 | guest-list-management                | Guest List Management: Template and Door Process       | on-the-day         | guest list template, guest list management                         | guest-list (D19)               |
| E11 | presale-codes                        | Presale Codes: How to Run an Exclusive Presale         | selling-tickets    | presale codes, ticket presale, unlock codes                        | presale-codes (D14)            |
| E12 | ticket-resale-rules-europe           | Ticket Resale Rules in Europe 2026: EU, UK, Ireland    | for-ticket-buyers  | ticket resale rules, ticket touting law, resell tickets            | ticket-resale (D64)            |
| E13 | fake-tickets                         | Fake Tickets: How to Spot Them and Buy Safely          | for-ticket-buyers  | fake tickets, ticket scams, check if ticket is real                | fake-tickets (D66)             |
| E14 | event-cancellation-refunds-eu        | Event Cancelled? Ticket Refund Rights in the EU        | law-tax            | event cancelled refund, concert cancelled refund rights europe     | cancellation-refunds (D30)     |
| E15 | vat-on-event-tickets-europe          | VAT on Event Tickets in Europe: Rates by Country       | law-tax            | vat on event tickets, vat rates admission europe                   | vat-event-tickets (D25)        |
| E16 | gdpr-for-event-organisers            | GDPR for Event Organisers: Data, Photos, Email         | law-tax            | gdpr events, gdpr photos at events, attendee data                  | gdpr (D35)                     |
| E17 | european-accessibility-act-ticketing | European Accessibility Act: Accessible Ticket Shops    | law-tax            | european accessibility act ticketing, accessible events            | accessibility-act (D28)        |
| E18 | e-invoicing-event-organisers         | E-invoicing in Europe 2026–2030 for Event Organisers   | law-tax            | e-invoicing europe, vida, e-invoicing mandate 2027                 | e-invoicing (D27)              |
| E19 | how-to-organise-a-festival           | How to Organise a Festival in 2027                     | event-types        | how to organise a festival, festival planning checklist            | organise-festival (D51)        |
| E20 | how-to-run-a-club-night              | How to Run a Club Night: A Promoter's Guide            | event-types        | club night promoter, sell club tickets                             | club-night (D49)               |
| E21 | charity-event-tickets                | Charity Event Tickets: Fundraising Events That Sell    | event-types        | charity event tickets, fundraising event                           | charity-events (D46)           |
| E22 | event-budget-template                | Event Budget Template: Cost Lines and Buffers          | planning-marketing | event budget template, event budget                                | event-budget (D58)             |
| E23 | ticket-payment-methods-europe        | Payment Methods for Ticket Buyers in Europe            | selling-tickets    | payment methods europe, wero, ideal, bancontact, sepa              | payment-methods-europe (D15)   |
| E24 | event-planning-checklist             | Event Planning Checklist 2026/27                       | planning-marketing | event planning checklist, how to plan an event                     | event-planning-checklist (D57) |
| E25 | event-seo-google-ai                  | Get Your Event Found on Google and AI Assistants       | planning-marketing | event seo, google events, structured data event                    | event-seo-ai (D60)             |

## Tasks

- **F1** Fact base DE (law/tax/figures 2026–2027 with sources) → `docs/20261107_ratgeber-facts-de.md`.
- **F2** Fact base competitors and EU rules (fees, features, sources) → `docs/20261107_ratgeber-facts-competitors-eu.md`.
- **T1** Content infra:
  - `content/ratgeber` and `content/guides` collections, contentOptions for both, generated lists
  - compile of extended frontmatter, headings, FAQ and reading time
  - `content:check` for both collections, plus `content:lint -- <files>` for single source files (frontmatter + body rules above; internal links checked against the slug tables, warnings only)
  - guard `content:clean`
  - unit tests for pure helpers
- **T2a** SEO heads:
  - article head (seoTitle, real og:image dims, JSON-LD Article + BreadcrumbList + FAQPage, Organization publisher, inLanguage, hreflang)
  - hub head (CollectionPage + ItemList + BreadcrumbList)
  - `<html lang="en">` under `/en/`, path-aware lang in `seoOutputCheck`
  - unit tests
- **T2b** Routes and views:
  - `/ratgeber`, `/ratgeber/$slug`, `/en/guides`, `/en/guides/$slug`; server-function loader for article HTML
  - hub (H1, intro, category sections, cards)
  - article (breadcrumb, category, H1, lead, date/reading time, hero image, TOC, body, CTA box, related, language switch)
  - markdown.css for tables, blockquotes and checklists; `SiteFrame`; `rootFooterShouldRender`; tests
- **T2c** Navigation: header "Ratgeber", footer "Ratgeber" + "English guides", demo nav mapping, tests.
- **T3** Static output:
  - prerender config, worker asset-first for the 4 path groups
  - `contentOutputCheck` for both collections
  - sitemap (hubs + both collections), `/llms.txt` at build
  - verify with `frontend:build:production` + `seo:check` + `ssr:check`
- **T4** Image tooling:
  - devDependency `@adaptive-ds/codex-imagen@0.3.0`, `_style.md`
  - `scripts/contentImageGenerate.ts` (reads prompt files, composes style + scene, calls the CLI with `--model gpt-image-2 --size 2048x1152 --quality medium --noWriteTxt`, sharp to 1920x1080 PNG, writes the alt sidecar, skips existing images, concurrency ≤ 6, verifies the output file exists because the CLI may exit 0 on failure)
  - `package.json` script `content:images`
- **T5** Contact FAQ correction (`src/contact/ContactFaqList.tsx`) to match the product facts.
- **W01–W26** Writing batches (articles + image prompt files).
- **I1** Generate all images, upload, `assets:lists`, verify that every article resolves its image.
- **V1** Integration: content:process/compile/check, typecheck, targeted unit tests, production build, seo:check, ssr:check, browser check of the homepage, hubs and sample articles; e2e spec for Ratgeber pages.
- **R1** Commits, merge to main, cleanup, preview deploy + checks, e2e on dev, push.

## Writing batches

- W01 D01 D09 D12 D13
- W02 D02 D03 D04 D05
- W03 D06 D07 D08 D11
- W04 D10 D14 D15
- W05 D16 D17 D18 D19
- W06 D20 D21 D22 D33
- W07 D23 D24 D25 D26
- W08 D27 D28 D29 D30
- W09 D31 D32 D34
- W10 D35 D36
- W11 D37 D38 D39
- W12 D40 D41 D42
- W13 D43 D44 D47
- W14 D45 D46
- W15 D48 D49 D50 D56
- W16 D51 D52 D53
- W17 D54 D55 D57
- W18 D58 D59 D60 D61
- W19 D62 D63
- W20 D64 D65 D66
- W21 E01 E02 E03 E23
- W22 E04 E05 E06 E11 E25
- W23 E07 E08 E09 E10
- W24 E12 E13 E14 E15
- W25 E16 E17 E18 E21
- W26 E19 E20 E22 E24

## Verification rules for subagents

- Use existing dependencies from `package.json` first. Add no new libraries except the pinned `@adaptive-ds/codex-imagen@0.3.0`.
- Run only targeted unit tests (`bun test <files>`), `bun run typecheck`, and content scripts relevant to the task. No full `bun test`, no e2e, and no production build except in T3 and V1. Never run `bun run codegen` or `content:clean`.
- Load the `code-style` skill for TS/TSX work. Reuse `#ui/...` components. Show dates in Europe/Berlin.

## Status

- Worktree: `/tmp/opencode/eventoren-ratgeber-Ct9Eof`, branch `feat/ratgeber-seo-geo` (from `main` b284d8e).
- Done: F1, F2, T1, T2a, T2b, T2c, T3, T4, T5, W01–W26 (all 66 DE + 25 EN), I1 (66 images uploaded, catalog regenerated, all articles resolve).
- Done also: QA passes (facts, arithmetic, Weeztix correction, quotes, overflow fix), V1 (build, seo/ssr checks, homepage bundle fix), e2e spec `e2e/workflows/content/contentPages.test.ts` (`bun run test:e2e:content:dev` / `test:e2e:content`).
- Pre-existing failures on main (not caused by this branch): format:check on 8 untouched files, shared-ui:check on `src/admin/AdminTicketOrdersPage.tsx`.
- Next: R1.
- Processes to stop during cleanup: dev server port 3091 (PID 3374333), wrangler port 8799 (PIDs 1094193, 1094195, 1094882).
- Note: the Verein tax threshold (§ 64 Abs. 3 / § 67a AO) is 50.000 €, not 45.000 €.
- Pending removal before merge: fixtures `content/ratgeber/2026-11-06-zz-test-fixture.md` and `content/guides/2026-11-06-zz-test-fixture.md`.
- Current context:
  - **Content API** (`src/app/content/`):
    - `contentArticleLoad({data:{collection,slug}})` is a server function that returns `Result<ContentArticle>`.
    - Collection helpers: `contentCollectionList(collection)`, `contentListItemFind`, `contentTranslationFind(key, lang)`, `contentPathCreate`.
    - Config and generated data: `contentCollectionConfig.ts` holds the categories and labels; `contentMetaList.ts` is generated.
    - Lint a single source file with `bun run content:lint -- <files>`.
  - **SEO heads** (`src/seo/`):
    - Articles: `contentArticleHeadCreate({entry,meta,faq})`.
    - Hubs: `contentHubHeadCreate(collection)`.
    - Hub copy (H1, titles, labels) lives in `contentHubSeoConfig.ts`.
  - **Images**: `bun run content:images [--only=key,...] [--concurrency=N]`. The house style is in `src/app/content/image-prompts/_style.md`.
  - **AGB issue (left for the user to decide)**: the AGB still list PayPal/Sofortüberweisung. It is legal text bound to checkout snapshots, so it is out of scope here.
