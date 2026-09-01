import type { EventFaqItem } from "./EventFaqItem.ts"
import type { EventItem } from "./EventItem.ts"
import { eventTimeFormat } from "./eventTimeFormat.ts"

const mockFaqsById: Record<string, readonly EventFaqItem[]> = {
  "kraftklub-arena-berlin": [
    {
      id: "einlass-zeiten",
      question: "Wann beginnt der Einlass in der Uber Arena?",
      answer:
        "Der reguläre Einlass öffnet um 18:30 Uhr. Inhaber:innen des Early Entry Pakets erhalten bereits ab 17:30 Uhr bevorzugten Zutritt.",
    },
    {
      id: "support-act",
      question: "Gibt es eine Vorband?",
      answer:
        "Ja, die Chemnitzer Band Blond eröffnet den Konzertabend ab ca. 20:00 Uhr vor der Hauptshow von Kraftklub.",
    },
    {
      id: "ticket-vorlage",
      question: "Wie weise ich mein Ticket am Einlass vor?",
      answer:
        "Das Ticket kann direkt digital auf dem Smartphone im Eventoren-Konto oder über die Apple/Google Wallet vorgezeigt werden.",
    },
    {
      id: "kategorien",
      question: "Welche Ticketkategorien gibt es für dieses Konzert?",
      answer:
        "Zur Auswahl stehen Innenraum Stehplätze mit freier Platzwahl, nummerierte Sitzplätze im Oberrang sowie limitierte Early Entry Pakete.",
    },
    {
      id: "taschen-mitnahme",
      question: "Welche Gegenstände dürfen in die Arena mitgenommen werden?",
      answer:
        "Es gelten die offiziellen Richtlinien der Uber Arena: Taschen bis maximal DIN-A4-Format sind gestattet, größere Rucksäcke müssen an den Gepäckstationen abgegeben werden.",
    },
  ],
  "philharmonie-mahler-5": [
    {
      id: "konzerteinfuehrung",
      question: "Gibt es vor dem Konzert eine Einführung?",
      answer:
        "Ja, um 19:00 Uhr findet im Großen Saal ein 30-minütiges moderiertes Einführungsgespräch zum Werk von Gustav Mahler statt.",
    },
    {
      id: "einlass-garderobe",
      question: "Ab wann ist der Saaleinlass geöffnet?",
      answer:
        "Das Foyer und der Saaleinlass der Elbphilharmonie öffnen ab 18:45 Uhr. Vor Ort steht eine kostenfreie Garderobennutzung zur Verfügung.",
    },
    {
      id: "pause",
      question: "Gibt es während des Konzerts eine Pause?",
      answer:
        "Ja, nach der Kammerfassung des Adagietto gibt es eine etwa 20-minütige Konzertpause im Foyer, bevor die 5. Sinfonie beginnt.",
    },
    {
      id: "dresscode",
      question: "Gibt es eine Kleiderordnung für das Konzert?",
      answer:
        "Es gibt keinen verbindlichen Dresscode. Gepflegte Freizeitkleidung oder elegante Abendgarderobe sind in der Elbphilharmonie gleichermaßen üblich.",
    },
    {
      id: "ticket-format",
      question: "Wie erhalte ich mein Ticket für die Elbphilharmonie?",
      answer:
        "Nach der Buchung findest du dein digitales Ticket mit Barcode/QR-Code in deinem Eventoren-Konto zur Vorlage am Saaleinlass.",
    },
  ],
  "wacken-open-air": [
    {
      id: "camping-anreise",
      question: "Ab wann ist die Camping-Anreise möglich?",
      answer:
        "Der Campingplatz öffnet am Mittwoch ab 10:00 Uhr. Die Campingplatznutzung ist im Festivalpass bereits vollständig enthalten.",
    },
    {
      id: "shuttlebus",
      question: "Fährt ein Shuttlebus vom Bahnhof zum Festival?",
      answer:
        "Ja, zwischen dem Bahnhof Itzehoe und dem Festivalgelände verkehren während des Festivalzeitraums kostenfreie Shuttlebusse.",
    },
    {
      id: "baendchentausch",
      question: "Wie erhalte ich mein Festivalbändchen?",
      answer:
        "Dein digitales Eventoren-Ticket wird bei der Ankunft an den offiziellen Check-in-Stationen vor Ort gegen das Festival-Armband eingetauscht.",
    },
    {
      id: "buehnen-zugang",
      question: "Welche Bühnen sind im 3-Tage-Pass enthalten?",
      answer:
        "Der Festivalpass berechtigt zum Zutritt zu allen 6 Festivalbühnen und dem gesamten Infield-Areal während aller drei Veranstaltungstage.",
    },
  ],
  "fusion-festival": [
    {
      id: "gelaende-camping",
      question: "Ab wann öffnet das Gelände am Flugplatz Lärz?",
      answer:
        "Der Einlass und die Zeltplatzöffnung beginnen am Mittwoch ab 10:00 Uhr. Camping auf dem Festivalgelände ist im Ticket enthalten.",
    },
    {
      id: "programmumfang",
      question: "Was umfasst das Kultur- und Musikprogramm?",
      answer:
        "Das Festival bietet vier Tage lang Musikfloors verschiedener Genres, Theaterzelte, Performance-Installationen, Zirkus und interaktive Workshops.",
    },
    {
      id: "ticket-personalisierung",
      question: "Ist das Festivalticket personalisiert?",
      answer:
        "Ja, die Tickets sind personengebunden. Am Einlass-Check-in erfolgt der Abgleich mit dem amtlichen Lichtbildausweis.",
    },
    {
      id: "abreise",
      question: "Bis wann muss das Gelände sonntags verlassen werden?",
      answer: "Nach den Abschluss-Sets am Sonntagvormittag ist die Zeltplatzräumung bis 12:00 Uhr mittags vorgesehen.",
    },
  ],
  "schauspielhaus-faust": [
    {
      id: "foyer-einlass",
      question: "Wann öffnet das Schauspielhaus Bochum?",
      answer: "Foyer und Garderobe öffnen ab 18:15 Uhr. Die Vorstellung im Theatersaal beginnt pünktlich um 19:00 Uhr.",
    },
    {
      id: "publikumsgespraech",
      question: "Findet im Anschluss ein Publikumsgespräch statt?",
      answer:
        "Ja, nach Ende des zweiten Teils findet um ca. 21:30 Uhr ein moderiertes Nachgespräch mit dem Ensemble im Foyer statt.",
    },
    {
      id: "spieldauer-pause",
      question: "Wie lange dauert die Aufführung und gibt es eine Pause?",
      answer:
        "Die Gesamtdauer beträgt ca. 3 Stunden inklusive einer 20-minütigen Foyerpause zwischen den beiden Teilen.",
    },
    {
      id: "ticket-vorlage",
      question: "Wie funktioniert die Einlasskontrolle?",
      answer:
        "Das digitale Ticket in deinem Eventoren-Konto kann direkt auf dem Smartphone am Saaleinlass gescannt werden.",
    },
  ],
  "bundesliga-bvb-sge": [
    {
      id: "oepnv-kombiticket",
      question: "Ist die Anreise mit Bus und Bahn im Ticket enthalten?",
      answer:
        "Ja, das Ticket fungiert als KombiTicket und berechtigt zur kostenfreien Hin- und Rückfahrt im gesamten VRR-Gebiet (3 Stunden vor bis 3 Stunden nach dem Spiel).",
    },
    {
      id: "stadionoeffnung",
      question: "Wann öffnen die Drehkreuze am Signal Iduna Park?",
      answer: "Die Stadiontore öffnen zwei Stunden vor Anpfiff, also um 13:30 Uhr. Der Anpfiff erfolgt um 15:30 Uhr.",
    },
    {
      id: "zahlung-stadion",
      question: "Wie kann im Stadion bezahlt werden?",
      answer:
        "Im Signal Iduna Park wird an allen Verpflegungsständen bargeldlos per Girocard, Kreditkarte oder Stadionkarte bezahlt.",
    },
    {
      id: "platzwahl",
      question: "Welche Bereiche stehen zur Verfügung?",
      answer:
        "Je nach Buchung hast du Zugang zu einem Stehplatz auf der Südtribüne oder einem überdachten Sitzplatz auf der Haupttribüne.",
    },
  ],
  "berlin-marathon-startplatz": [
    {
      id: "startunterlagen",
      question: "Wo und wann hole ich meine Startunterlagen ab?",
      answer:
        "Die Startunterlagen müssen vor dem Renntag persönlich auf der Marathon-Messe gegen Vorlage des digitalen Buchungsnachweises und Personalausweises abgeholt werden.",
    },
    {
      id: "startblock-zuteilung",
      question: "Wie erfolgt die Einteilung in die Startblöcke?",
      answer:
        "Die Zuteilung erfolgt anhand deiner nachgewiesenen Bestzeit. Startschuss für Welle 1 auf der Straße des 17. Juni ist um 09:15 Uhr.",
    },
    {
      id: "streckenverpflegung",
      question: "Gibt es Verpflegungs- und Versorgungsstationen an der Strecke?",
      answer:
        "Ja, entlang des 42,195 km Kurses stehen regelmäßige Wasser-, Elektrolyt- und Erfrischungsstationen sowie medizinische Betreuung bereit.",
    },
    {
      id: "finisher-medaille",
      question: "Erhalten alle Teilnehmenden eine Medaille?",
      answer:
        "Alle Läufer:innen, die das Ziel am Brandenburger Tor innerhalb des Zeitlimits erreichen, erhalten die offizielle Medaille und das Finisher-Shirt.",
    },
  ],
  "reise-nordlichter-tromsoe": [
    {
      id: "leistungen",
      question: "Welche Reiseleistungen sind im Paket enthalten?",
      answer:
        "Enthalten sind Hin- und Rückflüge ab/bis Frankfurt (FRA), 4 Hotelübernachtungen mit Frühstück in Tromsø, zwei geführte Aurora-Touren und eine Fjordkatamaran-Fahrt.",
    },
    {
      id: "aurora-ausruestung",
      question: "Wird warme Schutzkleidung für die Polarlichter-Touren gestellt?",
      answer:
        "Ja, für die beiden abendlichen Nordlicht-Exkursionen werden hochwertige Thermoanzüge und Winterstiefel zur Verfügung gestellt.",
    },
    {
      id: "reiseunterlagen",
      question: "Wann erhalte ich die detaillierten Reiseunterlagen?",
      answer:
        "Die vollständigen Buchungsbestätigungen, Flugzeiten und Hotelvouchers sind nach der Buchung digital im Eventoren-Konto hinterlegt.",
    },
    {
      id: "nordlicht-sichtung",
      question: "Gibt es eine Garantie für Nordlichter?",
      answer:
        "Polarlichter sind ein Naturphänomen. Erfahrene Guides wählen die besten Routen anhand aktueller Wetter- und Sonnenaktivitätsdaten, eine Sichtungsgarantie kann jedoch wetterbedingt nicht gegeben werden.",
    },
  ],
  "reise-toskana-weinwoche": [
    {
      id: "unterkunft",
      question: "Wo sind die Gäste während der Woche untergebracht?",
      answer:
        "Der Aufenthalt erfolgt im Agriturismo Le Vigne bei Greve in Chianti inklusive 6 Übernachtungen mit Halbpension.",
    },
    {
      id: "ausfluege-verkostungen",
      question: "Welche Aktivitäten sind fest eingeplant?",
      answer:
        "Das Programm beinhaltet 3 geführte Weinproben auf Chianti-Weingütern, einen Kochkurs für toskanische Spezialitäten sowie einen geführten Tagesausflug nach Siena.",
    },
    {
      id: "anreise-transfer",
      question: "Wie erfolgt die Anreise zum Agriturismo?",
      answer:
        "Die Anreise nach Florenz/Pisa erfolgt in Eigenregie. Detailinformationen zu Shuttle-Optionen und Mietwagen-Tipps erhältst du mit den Reiseunterlagen.",
    },
  ],
  "jazzclub-nightsession": [
    {
      id: "tischreservierung",
      question: "Gibt es feste Sitzplätze im Stadtgarten Köln?",
      answer:
        "Ja, mit deinem Ticket ist ein reservierter Sitzplatz an Clubtischen mit gastronomischem Tischservice verbunden.",
    },
    {
      id: "jam-session",
      question: "Kann ich nach dem Hauptkonzert bleiben?",
      answer:
        "Ja, nach den beiden Sets des Julia Hülsmann Quartetts ist der Eintritt zur anschließenden offenen Jam Session ab ca. 23:45 Uhr im Ticketpreis enthalten.",
    },
    {
      id: "einlass-zeit",
      question: "Wann beginnt der Einlass in den Club?",
      answer: "Der Einlass öffnet um 20:00 Uhr, das erste Konzertset beginnt um 21:00 Uhr.",
    },
  ],
  "museumsnacht-muenchen": [
    {
      id: "gueltigkeit",
      question: "Für welche Häuser gilt das Ticket der Langen Nacht?",
      answer:
        "Das Kombiticket berechtigt von 19:00 bis 02:00 Uhr zum Einlass in über 90 Museen, Galerien, Sammlungen und Ausstellungshäuser in ganz München.",
    },
    {
      id: "shuttlebusse",
      question: "Wie komme ich zwischen den verschiedenen Museen hin und her?",
      answer:
        "Alle offiziellen Sonder-Shuttlebuslinien zwischen den Museumszentren sind mit dem Ticket kostenfrei nutzbar.",
    },
    {
      id: "sonderfuehrungen",
      question: "Kosten die Führungen und Nachtprogramme extra?",
      answer:
        "Nein, alle regulären Sonderführungen, Konzerte und Lichtinstallationen des Nachtprogramms sind im Ticketpreis inbegriffen.",
    },
  ],
  "splash-hiphop-festival": [
    {
      id: "camping-anreise",
      question: "Ab wann ist die Anreise zum splash! Festival möglich?",
      answer:
        "Das Campinggelände in Ferropolis öffnet am Donnerstag. Der Festivalpass berechtigt zum Zelten während der gesamten Veranstaltungsdauer.",
    },
    {
      id: "buehnen-strand",
      question: "Welche Bereiche gehören zum Festivalgelände?",
      answer:
        "Neben den Hauptbühnen unter den Baggern umfasst das Areal den Badestrand am Gremminer See, den Skatepark und verschiedene Block-Party-Areas.",
    },
    {
      id: "ticket-einloesung",
      question: "Wie wird das Ticket vor Ort umgetauscht?",
      answer: "Dein digitales Ticket wird an den Eingangsschleusen direkt gegen das Festivalbändchen gescannt.",
    },
  ],
  "open-air-kino-hafen": [
    {
      id: "platzwahl-liegestuhl",
      question: "Wie funktioniert die Sitzplatzwahl am Freiluftkino?",
      answer:
        "Je nach gebuchter Kategorie hast du einen festen Liegestuhl mit bester Sicht oder freie Platzwahl auf der Kinowiese. Eigene Picknickdecken sind willkommen.",
    },
    {
      id: "wetter-decke",
      question: "Was passiert bei kühlem Wetter?",
      answer:
        "Vor Ort werden kostenlose wärmende Decken ausgegeben. Die Vorführung findet auch bei leichtem Sommerregen statt.",
    },
    {
      id: "sprache-fassung",
      question: "In welcher Sprachfassung wird der Film gezeigt?",
      answer:
        "Der Film 'Perfect Days' wird in der Originalfassung mit deutschen Untertiteln (OmU) auf der 12-Meter-Großleinwand präsentiert.",
    },
  ],
  "technoclub-warehouse-nacht": [
    {
      id: "altersbeschraenkung",
      question: "Gibt es ein Mindestalter für die Warehouse Night?",
      answer:
        "Ja, der Einlass zur Veranstaltung im Kraftwerk Mitte ist strikt ab 18 Jahren gestattet. Bitte bringe einen gültigen Personalausweis mit.",
    },
    {
      id: "floors",
      question: "Welche Floors sind geöffnet?",
      answer:
        "Mit deinem Ticket hast du Zugang zum Mainfloor, zum Club-Keller sowie zum überdachten Open-Air-Ambient-Hof.",
    },
    {
      id: "fast-lane",
      question: "Was bringt die Fast Lane Ticketkategorie?",
      answer:
        "Mit dem Fast Lane Ticket nutzt du den separaten Schnelleinlass ohne Wartezeit an der regulären Einlassschlange.",
    },
  ],
  "streetfood-markt-sonntag": [
    {
      id: "angebot-bezahlung",
      question: "Was erwartet die Besucher auf dem Street Food Markt?",
      answer:
        "Über 40 internationale Food-Trucks und Stände, Live-Musik am Rheinufer sowie ein Mitmach- und Bastelzelt für Kinder.",
    },
    {
      id: "oeffnungszeiten",
      question: "Wann hat der Markt am Sonntag geöffnet?",
      answer: "Der Markt auf den Rheinwiesen Oberkassel öffnet um 10:30 Uhr und läuft bis 20:00 Uhr abends.",
    },
    {
      id: "familienfreundlichkeit",
      question: "Ist das Event für Kinder geeignet?",
      answer: "Ja, das Gelände ist barrierearm begehbar und bietet ein ganztägiges Kreativ- und Kinderprogramm.",
    },
  ],
  "handball-thw-kiel-rn-loewen": [
    {
      id: "halleneinlass",
      question: "Wann beginnt der Einlass in die Wunderino Arena?",
      answer: "Die Halle öffnet 90 Minuten vor Anwurf um 16:30 Uhr. Der offizielle Anwurf erfolgt um 18:00 Uhr.",
    },
    {
      id: "kategorien-sicht",
      question: "Welche Bereiche können gebucht werden?",
      answer: "Verfügbar sind Stehplätze im Nordkurve-Fanblock sowie nummerierte Sitzplätze im zentralen Mittelblock.",
    },
    {
      id: "ticket-scan",
      question: "Wie erfolgt der Zugang an den Drehkreuzen?",
      answer: "Das mobile Ticket in deinem Eventoren-Konto kann direkt kontaktlos am Hallendrehkreuz gescannt werden.",
    },
  ],
  "oktoberfest-zeltreservierung": [
    {
      id: "reservierungsfenster",
      question: "Für welchen Zeitraum gilt die Zeltreservierung?",
      answer:
        "Die gebuchte Abendbox im Festzelt Schottenhamel ist exklusiv von 17:00 bis 23:00 Uhr für deine 10-köpfige Gruppe reserviert.",
    },
    {
      id: "verzehrmarken",
      question: "Welche Verzehrgutscheine sind enthalten?",
      answer:
        "Im Gesamtpaket sind 10 Wertmarken für je eine Maß Festbier und 10 Gutscheine für ein halbes Wiesn-Hendl enthalten.",
    },
    {
      id: "einlass-prozedere",
      question: "Über welchen Eingang erhält die Gruppe Zutritt?",
      answer:
        "Der Einlass erfolgt ab 16:30 Uhr über den ausgeschilderten Reservierungseingang gegen Vorlage der Buchungsbestätigung.",
    },
  ],
  "comedy-mixed-show": [
    {
      id: "ablauf-kuenstler",
      question: "Welche Comedians treten auf?",
      answer:
        "In der Mixed Show im Kesselhaus treten 5 professionelle Stand-up-Comedians mit wechselnden Sets und einer gemeinsamen Zugabenrunde auf.",
    },
    {
      id: "einlass-gastro",
      question: "Ab wann öffnet der Einlass im Kesselhaus?",
      answer:
        "Der Einlass und Barbetrieb in der Berliner Kulturbrauerei starten um 19:00 Uhr, die Show beginnt um 20:00 Uhr.",
    },
    {
      id: "pause",
      question: "Gibt es eine Pause während der Comedy-Show?",
      answer: "Ja, nach den ersten drei Acts gibt es eine ca. 20-minütige Erfrischungspause im Foyer.",
    },
  ],
  "reise-lissabon-staedtetrip": [
    {
      id: "reisedaten-flug",
      question: "Von welchem Flughafen startet die Städtereise?",
      answer:
        "Die Hin- und Rückflüge starten ab Berlin Brandenburg (BER) direkt nach Lissabon. Handgepäck und Aufgabegepäck sind enthalten.",
    },
    {
      id: "hotel-lage",
      question: "In welcher Lage befindet sich das Boutiquehotel?",
      answer:
        "Die Unterkunft liegt zentral im historischen Viertel Baixa in Lissabon, ideal für Stadterkundungen zu Fuß.",
    },
    {
      id: "enthaltene-touren",
      question: "Welche geführten Touren sind im Preis inbegriffen?",
      answer:
        "Inklusive sind ein geführter Rundgang durch Alfama mit traditionellem Fado-Abend sowie ein organisierter Tagesausflug nach Sintra.",
    },
  ],
  "weihnachtsmarkt-nuernberg-fuehrung": [
    {
      id: "treffpunkt",
      question: "Wo startet der geführte Rundgang?",
      answer:
        "Treffpunkt ist um 17:15 Uhr direkt am Hauptmarkt vor dem Christkindlesmarkt Nürnberg bei deinem/r Gästeführer/in.",
    },
    {
      id: "dauer-stationen",
      question: "Wie lange dauert die Führung und was wird besichtigt?",
      answer:
        "Der Rundgang dauert ca. 90 Minuten und beinhaltet exklusive Stationen bei einer Lebkuchenbäckerei und einer Zinnfigurenwerkstatt.",
    },
    {
      id: "heissgetraenk",
      question: "Ist das Heißgetränk im Ticketpreis enthalten?",
      answer:
        "Ja, ein Heißgetränk nach Wahl (original Nürnberger Glühwein oder alkoholfreier Kinderpunsch) ist inbegriffen.",
    },
  ],
  "silvester-tanz-in-den-jahreswechsel": [
    {
      id: "empfang-menue",
      question: "Wann beginnt der Silvesterball und das Galadinner?",
      answer:
        "Der festliche Empfang im Kurhaus Wiesbaden beginnt um 18:15 Uhr mit Begrüßungscocktail, gefolgt vom 4-Gänge-Menü ab 19:00 Uhr.",
    },
    {
      id: "live-musik",
      question: "Welche Musik wird während des Balls gespielt?",
      answer:
        "Die 17-köpfige Kurhaus-Big-Band begleitet den Abend mit Standard- und Lateintänzen sowie modernen Partyrhythmen.",
    },
    {
      id: "mitternacht",
      question: "Wo wird auf das neue Jahr angestoßen?",
      answer:
        "Zum Jahreswechsel versammeln sich alle Gäste mit Mitternachtssekt auf der Kurhaus-Terrasse mit Blick auf das Feuerwerk über dem Kurpark.",
    },
  ],
  "ski-alpin-weltcup-garmisch": [
    {
      id: "shuttle-anreise",
      question: "Fahren Shuttlebusse zum Kandahar-Zielstadion?",
      answer:
        "Ja, ab dem Bahnhof Garmisch-Partenkirchen verkehren ab 08:30 Uhr regelmäßige kostenlose Shuttlebusse direkt zum Renngelände.",
    },
    {
      id: "rennstart",
      question: "Wann startet die Herrenabfahrt?",
      answer:
        "Das Vorprogramm beginnt um 10:00 Uhr, der Start des ersten Läufers auf der Kandahar-Strecke erfolgt um 11:30 Uhr.",
    },
    {
      id: "siegerehrung",
      question: "Ist die Siegerehrung im Ticket enthalten?",
      answer:
        "Ja, die offizielle Pokalzeremonie im Zielbereich direkt nach Rennschluss kann von allen Ticketinhaber:innen miterlebt werden.",
    },
  ],
  "rock-am-ring-2027": [
    {
      id: "camping-kategorien",
      question: "Welche Camping-Optionen gibt es?",
      answer:
        "Je nach gebuchtem Festivalpass ist Standard-Camping oder Green-Camping auf den ausgewiesenen Arealen am Nürburgring inklusive.",
    },
    {
      id: "anreise-baendchen",
      question: "Ab wann kann angereist werden?",
      answer:
        "Die Zeltplätze öffnen ab Donnerstag um 12:00 Uhr. Die mobilen Tickets können an den Check-in-Stationen direkt gegen Festivalbändchen getauscht werden.",
    },
    {
      id: "buehnenprogramm",
      question: "Wie viele Bühnen bespielt das Festival?",
      answer:
        "Das Programm erstreckt sich über 4 Konzertbühnen mit über 80 Live-Bands von Freitagmittag bis Sonntagnacht.",
    },
  ],
  "tatort-lesung-hafenkrimi": [
    {
      id: "schiff-boarding",
      question: "Wo findet das Boarding für die Lesung statt?",
      answer:
        "Das Boarding beginnt ab 18:30 Uhr an Bord des historischen Frachtseglers im Museumshafen Oevelgönne in Hamburg.",
    },
    {
      id: "wetter-ausstattung",
      question: "Was passiert bei frischem Wetter an Deck?",
      answer: "Für alle Gäste stehen an Deck wärmende Wolldecken bereit. Das Deck ist windgeschützt ausgestattet.",
    },
    {
      id: "programm",
      question: "Wie ist die Lesung gegliedert?",
      answer:
        "Die zweistündige Veranstaltung teilt sich in zwei Lesungsblöcke mit Seemannslieder-Pause und anschließender Signierstunde.",
    },
  ],
  "reise-wandern-suedtirol": [
    {
      id: "anforderungen-guide",
      question: "Welche Kondition wird für die Wanderungen vorausgesetzt?",
      answer:
        "Die Tagesetappen rund um die Seiser Alm und das Schlern-Massiv erfordern solide Grundkondition und Trittsicherheit. Alle Touren werden von einem staatlich geprüften Bergführer geleitet.",
    },
    {
      id: "gepaecktransport",
      question: "Muss das Hauptgepäck auf den Hütten selbst getragen werden?",
      answer:
        "Nein, für den bequemen Gepäcktransport von Hütte zu Hütte ist gesorgt. Für die Tageswanderungen genügt ein Tagesrucksack.",
    },
    {
      id: "unterkunft-verpflegung",
      question: "Wie sind die Übernachtungen auf den Schutzhütten geregelt?",
      answer:
        "Enthalten sind 6 Übernachtungen auf alpinen Berghütten inklusive regionaler Halbpension (Frühstück und warmes Abendessen).",
    },
  ],
  "arena-tour-annenmaykantereit": [
    {
      id: "einlass-lanxess",
      question: "Wann beginnt der Einlass in die Lanxess Arena?",
      answer:
        "Der Einlass öffnet um 18:30 Uhr. Das Konzert von AnnenMayKantereit mit Streicherensemble beginnt um 20:00 Uhr.",
    },
    {
      id: "ticket-kategorien",
      question: "Welche Plätze bieten die verschiedenen Ticketkategorien?",
      answer:
        "Verfügbar sind Stehplätze im Innenraum mit freier Platzwahl sowie nummerierte Sitzplätze im Unterrang und Oberrang.",
    },
    {
      id: "einlass-ticket",
      question: "Wie wird das Ticket am Eingang kontrolliert?",
      answer:
        "Das mobile Ticket kann direkt in der Eventoren-App oder im Browser auf dem Smartphone am Drehkreuz gescannt werden.",
    },
  ],
  "basketball-euroleague-bayern": [
    {
      id: "einlass-sap-garden",
      question: "Ab wann ist der SAP Garden am Spieltag geöffnet?",
      answer:
        "Der Einlass öffnet zwei Stunden vor Spielbeginn um 18:30 Uhr. Der Tip-off gegen Real Madrid erfolgt um 20:30 Uhr.",
    },
    {
      id: "courtside-catering",
      question: "Welche Leistungen beinhaltet das Courtside-Ticket?",
      answer:
        "Courtside-Tickets bieten direkte Plätze am Spielfeldrand sowie Zugang zur VIP-Lounge mit Catering vor, während und nach dem Spiel.",
    },
    {
      id: "anreise-parken",
      question: "Wie reise ich am besten zum SAP Garden im Olympiapark an?",
      answer:
        "Die Anreise wird mit den öffentlichen Verkehrsmitteln (U-Bahn-Linien U3/U8 bis Olympiazentrum) empfohlen. Parkplätze im Olympiapark stehen gebührenpflichtig zur Verfügung.",
    },
  ],
}

function eventFaqsFallback(event: EventItem): readonly EventFaqItem[] {
  const doorsLabel = event.doorsAt ? eventTimeFormat(event.doorsAt) : undefined
  const startLabel = eventTimeFormat(event.startsAt)
  const tierNames = event.tiers.map((tier) => tier.name).join(", ")

  const items: EventFaqItem[] = [
    {
      id: "doors-and-start",
      question: "Wann beginnt der Einlass und das Event?",
      answer: doorsLabel
        ? `Der Einlass beginnt voraussichtlich um ${doorsLabel}. Das Event '${event.title}' startet um ${startLabel} in ${event.venue}.`
        : `Das Event '${event.title}' startet um ${startLabel} in ${event.venue}. Wir empfehlen, frühzeitig vor Beginn vor Ort zu sein.`,
    },
    {
      id: "ticket-retrieval",
      question: "Wie erhalte ich mein Ticket nach dem Kauf?",
      answer:
        "Nach erfolgreicher Buchung steht dein Ticket unmittelbar digital in deinem Eventoren-Konto unter 'Meine Tickets' bereit. Am Einlass genügt das Vorzeigen des QR-Codes auf deinem Smartphone.",
    },
    {
      id: "ticket-tiers",
      question: "Welche Ticketkategorien stehen zur Auswahl?",
      answer: tierNames
        ? `Für dieses Event werden folgende Kategorien angeboten: ${tierNames}.${event.soldOut ? " Dieses Event ist derzeit leider ausverkauft." : ""}`
        : "Die verfügbaren Kategorien und Preise werden direkt in der Ticketauswahl angezeigt.",
    },
    {
      id: "location-arrival",
      question: "Wo findet das Event statt und wie reise ich an?",
      answer: `Die Spielstätte ist ${event.venue} in ${event.address}, ${event.city}. Bitte plane ausreichend Zeit für die Anreise und die Einlasskontrollen ein.`,
    },
    {
      id: "organizer-guidelines",
      question: "Wer veranstaltet das Event und welche Richtlinien gelten?",
      answer: `Veranstalter dieses Events ist ${event.organizer}. Es gelten die regulären Einlass- und Hausordnungsbestimmungen der Spielstätte sowie des Veranstalters.`,
    },
  ]

  return items.slice(0, 5)
}

export function eventFaqsGet(event: EventItem): readonly EventFaqItem[] {
  const exact = mockFaqsById[event.id]
  if (exact && exact.length > 0) {
    return exact.slice(0, 5)
  }

  return eventFaqsFallback(event)
}
