---
title: "Event bei Google und KI-Assistenten sichtbar machen (2026)"
seoTitle: "Event bei Google & KI sichtbar machen"
description: "Event bei Google eintragen: So erscheint deine Veranstaltung in der Google-Suche und in KI-Antworten, mit strukturierten Daten, eventStatus und Checkliste."
publishedAt: "2026-11-06"
slug: "event-sichtbar-google-ki"
author: "Eventoren Redaktion"
image: "ratgeber-event-sichtbar-google-ki"
imageAlt: "Riesige jubelnde Festivalmenge bei Tageslicht vor der Hauptbühne mit bunten Fahnen, alle Hände in der Luft"
category: "planung-marketing"
keywords:
  [
    "event bei google eintragen",
    "veranstaltung google",
    "strukturierte daten event",
    "google event suche",
    "event schema",
    "eventstatus abgesagt",
    "event in chatgpt finden",
    "google unternehmensprofil veranstaltung",
  ]
translationKey: "event-seo-ai"
---

Damit dein Event bei Google erscheint, brauchst du eine eigene, öffentlich erreichbare Seite pro Veranstaltung mit allen Fakten im Text und strukturierten Daten vom Typ `Event`. Google nennt drei Pflichtangaben: Name, Startdatum und Ort mit Adresse. Verkaufst du über eine Ticketplattform, die das schon liefert, musst du technisch nichts weiter tun. KI-Assistenten wie ChatGPT, Perplexity, Gemini und Googles AI Overviews arbeiten nach allem, was die Anbieter offiziell sagen, mit denselben Grundlagen: crawlbare Seiten, klare Texte, konsistente Angaben. Eine geheime Zusatzoptimierung für KI gibt es laut Google nicht. Hier findest du die Anforderungen aus der Google-Dokumentation, eine Checkliste und eine ehrliche Trennung zwischen Wissen und Spekulation (Stand: November 2026).

> **Das Wichtigste in Kürze**
>
> - Google zeigt Events in einer eigenen Event-Darstellung in der Suche und in Google Maps. Deutschland mit deutscher Sprache ist laut Google-Dokumentation dabei.
> - Pflicht für strukturierte Event-Daten: `name`, `startDate` und `location` mit Adresse. Empfohlen: Beschreibung, Enddatum, Bild, Preisangebot, Veranstalter, Künstler und `eventStatus`.
> - Bei Absage oder Verschiebung änderst du den `eventStatus`, löschst aber nie Datum oder Ort. Nur so versteht Google, welches Event betroffen ist.
> - Für KI-Antworten gilt laut Google: keine Zusatzanforderungen, kein spezielles Schema, keine eigene KI-Datei nötig. Die Seite muss indexiert sein und einen Snippet zeigen dürfen.
> - Einheitliche Angaben auf Eventseite, Ticketshop, Social Media und in Veranstaltungskalendern helfen Menschen und Maschinen gleichermaßen.

## Wie erscheinen Events in der Google-Suche?

Google hat für Veranstaltungen eine eigene **Event-Darstellung** (in der Dokumentation „event experience“): eine interaktive Liste mit Datum, Ort, Bild und Link zur Ticketseite, die in der Suche und in anderen Google-Produkten wie Google Maps erscheinen kann. Laut Google Search Central ist sie unter anderem in Deutschland auf Deutsch verfügbar (Stand: Dokumentation vom 08.09.2026).

Google nennt drei Wege in diese Darstellung:

1. **Über eine Plattform:** Veröffentlichst du dein Event auf einer Ticketing- oder Eventplattform, die mit Google zusammenarbeitet bzw. strukturierte Daten liefert, reicht es, das Event dort sauber einzutragen.
2. **Über ein CMS-Plugin:** Nutzt du WordPress oder ein anderes System, kann ein Plugin die strukturierten Daten ergänzen.
3. **Selbst im HTML:** Du baust die strukturierten Daten in deine Eventseite ein, meist als JSON-LD.

Eine Garantie gibt es in keinem Fall. Google schreibt ausdrücklich, dass korrekt ausgezeichnete Seiten nicht zwingend als Rich Result erscheinen. Gute Daten erhöhen die Chance, sie erzwingen nichts.

### Welche Events zeigt Google nicht?

Die Richtlinien schließen einige Fälle aus. Das ist für viele Veranstalter wichtig:

| Fall                                                                                         | Erlaubt in der Event-Darstellung? | Was das für dich heißt                                      |
| -------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------- |
| Öffentliches Konzert, Party, Fest mit Ticketkauf für alle                                    | ja                                | Standardfall                                                |
| Event nur für Mitglieder oder nur mit Einladung vor dem Ticketkauf                           | nein                              | reine Presale- oder Mitglieder-Events erscheinen dort nicht |
| Zuschauer-Event mit überwiegend minderjährigen Teilnehmern und Publikum auf dem Schulgelände | nein                              | Schultheater und Schulkonzerte nicht darauf auslegen        |
| Rein virtuelles Event ohne physischen Ort                                                    | nein                              | Livestreams brauchen einen anderen Weg                      |
| Rabattaktion, „Tickets jetzt 50 % günstiger“                                                 | nein                              | Angebote sind keine Events                                  |
| Öffnungszeiten, Gutscheine, Reisepakete                                                      | nein                              | nicht als Event auszeichnen                                 |

Ein Event mit einem Presale nur per Code und einem späteren öffentlichen Verkauf ist dagegen ein normales öffentliches Event. Wie du Presales aufsetzt, steht im Ratgeber [Presale- und Freischaltcodes](/ratgeber/freischaltcodes-presale). Für Theater und Konzerte an Schulen hilft der Ratgeber [Tickets für Schulveranstaltungen](/ratgeber/schulveranstaltung-tickets).

![Abendliche Arenashow, tausende Besucher halten leuchtende Smartphones hoch und filmen den Auftritt unter funkelndem Bühnenlicht](ratgeber-event-sichtbar-google-ki-szene-1)

## Was sind strukturierte Daten für Events?

**Strukturierte Daten** sind ein standardisierter, maschinenlesbarer Steckbrief einer Seite. Für Veranstaltungen nutzt man den Typ `Event` aus dem Vokabular schema.org. Er sagt Suchmaschinen eindeutig, wie das Event heißt, wann es beginnt, wo es stattfindet und was ein Ticket kostet, statt dass sie das aus dem Fließtext erraten müssen.

### Pflicht- und empfohlene Angaben laut Google

| Eigenschaft         | Status                  | Was hinein gehört                                                                               | Häufiger Fehler                                  |
| ------------------- | ----------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `name`              | Pflicht                 | Name des Events, z. B. „Sommerfest des TV Musterstadt 2027“                                     | Ortsname, Preis oder „Konzert“ als Name          |
| `startDate`         | Pflicht                 | Datum und Uhrzeit im ISO-8601-Format mit Zeitzone, z. B. `2027-06-12T19:00+02:00`               | Uhrzeit ohne Zeitzone, falsche Sommerzeit        |
| `location`          | Pflicht                 | `Place` mit `name` (Name der Location) und `address` (vollständige Postanschrift)               | nur Stadtname, Eventname im Feld für den Ort     |
| `description`       | empfohlen               | konkrete Beschreibung des Events, nicht der Website                                             | Datum und Ort nur im Text statt in den Feldern   |
| `endDate`           | empfohlen               | Ende im selben Format wie der Start                                                             | fehlt bei mehrtägigen Events                     |
| `eventStatus`       | empfohlen               | geplant, abgesagt, verschoben, neu terminiert                                                   | nicht aktualisiert nach Absage                   |
| `image`             | empfohlen               | Bild-URL, Google empfiehlt 1920 px Breite, mindestens 720 px, am besten 16:9, 4:3 und 1:1       | Flyer mit viel Text, Bild nicht crawlbar         |
| `offers`            | empfohlen               | ein Angebot pro Ticketart mit `price`, `priceCurrency`, `availability`, `url`, ggf. `validFrom` | Preis ohne Gebühren, „InStock“ trotz ausverkauft |
| `organizer`         | empfohlen               | Name und URL des Veranstalters                                                                  | fehlt ganz                                       |
| `performer`         | empfohlen               | Band, Künstler, Comedian, je Person oder Gruppe ein Eintrag                                     | Künstler im Eventnamen statt hier                |
| `previousStartDate` | empfohlen bei Verlegung | altes Startdatum, nur zusammen mit `EventRescheduled`                                           | mit anderem Status kombiniert                    |

Zwei Details aus der Google-Dokumentation, die oft übersehen werden: Der Preis in `offers.price` soll der **niedrigste verfügbare Preis inklusive Service- und Systemgebühren** sein, und bei kostenlosen Events ist er 0. Das passt zur deutschen Pflicht, Gesamtpreise anzugeben, mehr dazu im Ratgeber [Ticketgebühren](/ratgeber/ticketgebuehren). Und `offers.url` muss auf eine Seite führen, auf der jeder aus der Öffentlichkeit ein Ticket für genau dieses Event kaufen kann.

### Technische Regeln

- **Eine URL pro Event.** Jede Veranstaltung braucht eine eigene Seite mit eigener Auszeichnung. Übersichtsseiten mit vielen Terminen sind nicht das Ziel.
- **Mehrtägig richtig auszeichnen.** Ein Festival über drei Tage bekommt Start- und Enddatum. Gibt es pro Tag eigene Tickets, bekommt jede Vorstellung ein eigenes `Event`.
- **Zeitzone angeben.** Für Deutschland ist das +01:00 im Winter und +02:00 in der Sommerzeit. Ganztägige Events dürfen nur das Datum ohne Uhrzeit tragen.
- **Testen.** Mit dem Rich-Results-Test prüfst du den Code, mit dem URL-Prüftool der Search Console, ob Google die Seite abrufen kann. Eine Sitemap hilft Google, neue Eventseiten zu finden. Rechne mit einigen Tagen, bis eine neue Seite gecrawlt ist.

### Beispiel: Event-Daten als JSON-LD

So sieht eine minimale, vollständige Auszeichnung für ein fiktives Fest aus. Ersetze alle Werte durch deine.

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Sommerfest TV Musterstadt 2027",
  "startDate": "2027-06-12T18:00+02:00",
  "endDate": "2027-06-13T01:00+02:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "Stadthalle Musterstadt",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Hallenweg 1",
      "postalCode": "12345",
      "addressLocality": "Musterstadt",
      "addressCountry": "DE"
    }
  },
  "image": ["https://example.org/bilder/sommerfest-16x9.jpg"],
  "description": "Open-Air-Sommerfest mit Liveband, Grill und Kinderprogramm bis 20 Uhr.",
  "offers": {
    "@type": "Offer",
    "url": "https://example.org/tickets/sommerfest-2027",
    "price": "18.00",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock"
  },
  "organizer": { "@type": "Organization", "name": "TV Musterstadt e. V.", "url": "https://example.org" },
  "performer": { "@type": "PerformingGroup", "name": "Die Beispielband" }
}
```

## Was tust du bei Absage oder Verschiebung?

Hier passieren die meisten Fehler: Das Event wird abgesagt, die Seite gelöscht oder das Datum entfernt, und Google zeigt weiter den alten Termin. Die Google-Dokumentation ist eindeutig:

| Situation                           | `eventStatus`                                 | `startDate`                                                  | Weitere Schritte                                                     |
| ----------------------------------- | --------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| Findet statt                        | `EventScheduled` (Standard, darf auch fehlen) | Termin                                                       | –                                                                    |
| Abgesagt                            | `EventCancelled`                              | **altes Datum bleibt stehen**                                | Ort und alle anderen Angaben nicht entfernen, Seite online lassen    |
| Verschoben, neuer Termin noch offen | `EventPostponed`                              | **altes Datum bleibt stehen**, bis der neue Termin feststeht | Seite mit Hinweis „neuer Termin folgt“                               |
| Neuer Termin steht fest             | `EventRescheduled`                            | **neues Datum**                                              | `previousStartDate` mit dem alten Datum ergänzen, `endDate` anpassen |

Lösche die Seite eines abgesagten Events also nicht sofort. Sie ist für Gäste die erste Anlaufstelle für Erstattungsinformationen. Was du Ticketkäufern bei Absage und Verlegung schuldest und eine Vorlage für die Absage-Mail findest du im Ratgeber [Veranstaltung absagen oder verschieben](/ratgeber/veranstaltung-absagen).

## Eventseite auf der Ticketplattform oder auf der eigenen Website?

Beides hat Vorteile. Viele Veranstalter nutzen beides, wichtig ist nur, dass die Angaben übereinstimmen.

| Kriterium               | Eventseite der Ticketplattform           | Eigene Website                                    |
| ----------------------- | ---------------------------------------- | ------------------------------------------------- |
| Strukturierte Daten     | oft automatisch, je nach Anbieter prüfen | musst du selbst einbauen oder per Plugin ergänzen |
| Aufwand                 | gering, Felder ausfüllen                 | höher, Technik und Pflege                         |
| Kaufbutton              | direkt auf der Seite                     | Link oder eingebetteter Shop                      |
| Eigene Marke und Archiv | begrenzt                                 | voll: Historie, Fotos, Presse, Sponsoren          |
| Stärke der Domain       | hängt von der Plattform ab               | wächst mit jedem Event auf deiner Domain          |
| Wiederkehrende Reihen   | eine Seite pro Termin                    | eine Übersichtsseite plus eine Seite pro Termin   |

Unsere Einschätzung, keine offizielle Google-Regel: Für ein einzelnes Event reicht die Eventseite der Ticketplattform, wenn sie strukturierte Daten ausliefert. Für eine Reihe oder einen Verein mit regelmäßigen Events lohnt sich zusätzlich die eigene Website mit Übersicht, Archiv und Links auf die Ticketseiten. Zeichnest du auf der eigenen Seite ebenfalls ein `Event` aus, zeigt `offers.url` auf die Ticketseite, und alle Daten müssen identisch sein. Widersprüchliche Uhrzeiten auf zwei Seiten sind schlimmer als nur eine Seite.

### Was gehört in den Text der Eventseite?

Strukturierte Daten ersetzen keinen guten Text. Google weist darauf hin, dass die Auszeichnung zum sichtbaren Inhalt passen muss. Schreibe die Seite so, dass ein Mensch alle Fragen ohne Nachfragen beantwortet bekommt:

- Was ist es, für wen, und warum lohnt es sich? In zwei bis drei Sätzen am Anfang.
- Datum, Beginn, Einlass, Ende, Ort mit Adresse und Anfahrt.
- Alle Ticketarten mit Gesamtpreisen, Abendkassenpreis, Altersgrenze.
- Programm oder Line-up mit Zeiten, sobald bekannt.
- Barrierefreiheit, Garderobe, Parken, Hinweise zu Fotos.
- Veranstalter mit Kontakt.

![Begeisterte Konzertbesucher klatschen im ausverkauften Saal, auf der Bühne verbeugt sich die Band im Scheinwerferlicht](ratgeber-event-sichtbar-google-ki-szene-2)

## Wie hilft das Google Unternehmensprofil?

Hat deine Organisation einen festen Ort mit Publikumsverkehr, etwa ein Vereinsheim, einen Club, eine Bühne oder eine Location, kann ein **Google Unternehmensprofil** zusätzlich Sichtbarkeit in der Suche und in Google Maps bringen. Dort kannst du laut Google-Hilfe Beiträge vom Typ **„Veranstaltungen“** veröffentlichen, mit Titel, Start- und Enddatum, Uhrzeiten, Beschreibung, Foto oder Video und einem Button, etwa zum Ticketkauf.

Praktische Hinweise:

- Lege einen Veranstaltungsbeitrag pro Event an und verlinke die Ticketseite mit einem Tracking-Link.
- Beiträge ohne angegebenen Zeitraum werden nach sechs Monaten archiviert. Mit Zeitraum bleiben sie bis zum Ende sichtbar.
- Halte Öffnungszeiten, Adresse und Website im Profil aktuell. Google empfiehlt in seinen Hinweisen zu den KI-Funktionen der Suche ausdrücklich, die Unternehmensprofil-Daten aktuell zu halten.
- Beiträge mit Telefonnummern im Text können laut Google abgelehnt werden, wenn die Nummer nicht zum Unternehmen gehört.

Für Veranstalter ohne festen Ort, etwa wechselnde Locations, ist das Profil der Location der bessere Platz. Frag den Betreiber, ob er dein Event dort als Beitrag einstellt.

## Wie wird dein Event in ChatGPT, Perplexity, Gemini und AI Overviews sichtbar?

Viele Menschen fragen inzwischen KI-Assistenten nach „Was ist am Wochenende in Köln los?“. Ob und wie dein Event dort auftaucht, entscheiden die Anbieter, und sie legen ihre Systeme nur teilweise offen. Deshalb trennt dieser Abschnitt bewusst zwischen dem, was offiziell dokumentiert ist, und dem, was plausibel, aber nicht belegt ist.

### Was offiziell dokumentiert ist

| Anbieter                               | Was der Anbieter sagt (Stand: November 2026)                                                                                                                                                                               | Was du tun kannst                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Google AI Overviews und AI Mode        | Keine zusätzlichen Anforderungen. Die Seite muss indexiert sein und mit Snippet in der Suche erscheinen dürfen. Kein spezielles Schema, keine KI-Textdateien nötig. Strukturierte Daten sollen zum sichtbaren Text passen. | normale SEO-Grundlagen: crawlbar, verlinkt, Text statt nur Bild, Unternehmensprofil aktuell |
| Google Gemini (Training und Grounding) | Das Token `Google-Extended` in der robots.txt steuert die Nutzung für Gemini-Training und Grounding, hat aber keinen Einfluss auf die Google-Suche.                                                                        | bewusst entscheiden, nichts versehentlich sperren                                           |
| ChatGPT-Suche (OpenAI)                 | `OAI-SearchBot` sorgt für die Anzeige in den Suchergebnissen von ChatGPT. Wer ihn sperrt, erscheint dort nicht in Suchantworten. `GPTBot` ist davon unabhängig und betrifft das Training.                                  | `OAI-SearchBot` in der robots.txt erlauben                                                  |
| Perplexity                             | `PerplexityBot` dient dazu, Websites in Perplexity-Suchergebnissen anzuzeigen und zu verlinken, nicht dem Modelltraining.                                                                                                  | `PerplexityBot` erlauben, Firewall-Regeln prüfen                                            |

Ein häufiges Problem sind nicht die robots.txt-Regeln, sondern Schutzfunktionen beim Hosting oder CDN, die Bots pauschal blockieren. Prüfe, ob dein Anbieter eine solche Einstellung aktiv hat. Google nennt ausdrücklich auch CDN- und Hosting-Sperren als Fehlerquelle.

### Was plausibel, aber nicht belegt ist

Die folgenden Punkte sind unsere Einschätzung. Kein Anbieter hat sie als Rankingfaktor bestätigt:

- **Erwähnungen auf anderen Seiten** wie Stadtmagazin, Veranstaltungskalender, Lokalzeitung, Künstlerseite: KI-Assistenten mit Websuche zitieren sichtbar Quellen. Je mehr seriöse Seiten dein Event mit denselben Fakten nennen, desto eher taucht es als Quelle auf.
- **Konsistenz:** Unterschiedliche Uhrzeiten oder Preise auf verschiedenen Seiten können dazu führen, dass ein Assistent falsche oder vorsichtige Angaben macht.
- **Klare Sätze statt Werbefloskeln:** „Das Sommerfest des TV Musterstadt findet am 12. Juni 2027 ab 18 Uhr in der Stadthalle Musterstadt statt“ lässt sich leicht zitieren. „Der Sommer wird legendär!“ nicht.
- **Aktualität:** Eine Seite, die nach einer Änderung sofort aktualisiert wird, ist die verlässlichste Quelle für alle Systeme.

Nicht belegt und von Google für die eigene Suche ausdrücklich verneint: dass du spezielle KI-Dateien, Schlüsselwörter für Chatbots oder besonderes Markup brauchst. Wer dir eine garantierte Platzierung in ChatGPT verkauft, verkauft etwas, das niemand garantieren kann.

## Checkliste: Eine Eventseite, die gefunden wird

**Inhalt**

- [ ] Eigene URL nur für dieses Event, öffentlich ohne Login erreichbar
- [ ] Eventname ohne Preis, Werbung oder Großbuchstaben-Rufe
- [ ] Datum, Beginn, Einlass und Ende im sichtbaren Text
- [ ] Location-Name und vollständige Adresse im Text
- [ ] Beschreibung mit Programm, Zielgruppe und Altersgrenze in den ersten Sätzen
- [ ] Alle Ticketarten mit Gesamtpreisen inklusive Gebühren
- [ ] Bild im Querformat mit mindestens 1920 px Breite, ohne viel Text
- [ ] Veranstalter mit Kontakt und Impressum

**Technik**

- [ ] Strukturierte Daten `Event` mit `name`, `startDate`, `location` und Adresse
- [ ] Empfohlene Felder: `endDate`, `description`, `image`, `offers`, `organizer`, `performer`, `eventStatus`
- [ ] Zeitzone im Datum korrekt (Sommerzeit beachten)
- [ ] Rich-Results-Test ohne kritische Fehler
- [ ] Seite nicht per robots.txt, noindex oder Firewall gesperrt, auch nicht für OAI-SearchBot und PerplexityBot
- [ ] Seite in der Sitemap und von der Startseite oder Übersicht verlinkt

**Verbreitung und Pflege**

- [ ] Gleiche Fakten in Veranstaltungskalendern, Social Media, Pressemitteilung und Unternehmensprofil
- [ ] Künstler, Location und Partner verlinken auf die Eventseite
- [ ] Bei ausverkauft `availability` auf `SoldOut`, bei Absage `eventStatus` ändern, Seite nicht löschen
- [ ] Nach dem Event: Seite mit Rückblick und Link zum nächsten Termin weiterführen

Wie du die Eventseite anschließend bewirbst, steht im Ratgeber [Event-Marketing](/ratgeber/event-marketing).

## So setzt du das mit Eventoren um

Jedes veröffentlichte Event bei Eventoren bekommt eine eigene öffentliche Eventseite unter `/events/<id>`. Diese Seiten enthalten strukturierte Daten nach schema.org vom Typ `Event`, unter anderem mit Name, Datum, Ort, Veranstalter, Preis-Angebot und, falls hinterlegt, Bild. Du musst dafür keinen Code schreiben. Fülle Titel, Beschreibung, Location, Adresse und Bild vollständig aus, denn die strukturierten Daten können nur so gut sein wie deine Angaben.

Auf der Eventseite kaufen Gäste ohne Konto als Gast, das Ticket kommt als PDF mit QR-Code per E-Mail. Hast du eine eigene Website, verlinkst du von dort auf die Eventoren-Eventseite. Für Entwickler stehen Organisationen außerdem API-Schlüssel und eine HTTP-API zur Verfügung.

Bevor der Verkauf startet, prüft und bestätigt Eventoren deine Organisation. Plane das bei kurzfristigen Events ein. Fragen zur Eventseite beantworten wir über das [Kontaktformular](/kontakt).

## Häufige Fragen

### Wie trage ich mein Event bei Google ein?

Ein Eintragsformular gibt es nicht. Google findet Events über Seiten mit strukturierten Daten vom Typ `Event`. Veröffentliche dein Event auf einer Plattform, die diese Daten liefert, oder baue sie selbst in deine Eventseite ein und prüfe sie mit dem Rich-Results-Test. Eine Anzeige in der Event-Darstellung garantiert Google nicht.

### Welche Angaben braucht Google für ein Event mindestens?

Pflicht sind der Name des Events, das Startdatum mit Uhrzeit im ISO-8601-Format und der Ort mit Name und vollständiger Adresse. Empfohlen sind außerdem Enddatum, Beschreibung, Bild, Ticketangebot mit Preis, Veranstalter, Künstler und der Status des Events.

### Was mache ich bei Google, wenn mein Event abgesagt wird?

Setze `eventStatus` auf `EventCancelled` und lass Datum, Ort und alle anderen Angaben unverändert stehen. Lösche die Seite nicht, sondern nenne dort, wie Ticketkäufer ihr Geld zurückbekommen. Bei einer Verschiebung nutzt du `EventPostponed` und nach Festlegung des neuen Termins `EventRescheduled` mit `previousStartDate`.

### Wie kommt mein Event in ChatGPT oder Perplexity?

Garantien gibt es nicht. Offiziell dokumentiert ist: Die Bots `OAI-SearchBot` und `PerplexityBot` müssen deine Seite abrufen dürfen, sonst erscheint sie dort nicht in Suchantworten. Darüber hinaus helfen nach unserer Einschätzung klare, gut zitierbare Sätze, einheitliche Angaben überall und Erwähnungen auf anderen seriösen Seiten.

### Brauche ich eine llms.txt oder spezielles Markup für KI?

Für Googles AI Overviews und AI Mode nicht: Google schreibt, dass weder neue maschinenlesbare Dateien noch KI-Textdateien oder spezielles Markup nötig sind. Andere Anbieter haben dazu keine verbindlichen Aussagen gemacht. Konzentriere dich auf eine vollständige, crawlbare Eventseite mit strukturierten Daten.

## Quellen

- [Google Search Central: Strukturierte Daten für Veranstaltungen (Event), zuletzt aktualisiert 08.09.2026](https://developers.google.com/search/docs/appearance/structured-data/event)
- [Google Search Central: KI-Funktionen und deine Website (AI Overviews, AI Mode)](https://developers.google.com/search/docs/appearance/ai-features)
- [Google Search Central: Google-Crawler und Google-Extended](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers)
- [Google Unternehmensprofil-Hilfe: Beiträge erstellen und verwalten](https://support.google.com/business/answer/7342169?hl=de)
- [OpenAI: Übersicht der Crawler OAI-SearchBot, GPTBot, ChatGPT-User](https://platform.openai.com/docs/bots)
- [Perplexity: Perplexity Crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
- [schema.org: Event](https://schema.org/Event)
