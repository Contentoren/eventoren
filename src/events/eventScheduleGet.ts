import type { EventItem } from "./EventItem.ts"
import type { EventScheduleItem } from "./EventScheduleItem.ts"
import { eventTimeFormat } from "./eventTimeFormat.ts"

const mockScheduleById: Record<string, readonly EventScheduleItem[]> = {
  "kraftklub-arena-berlin": [
    {
      marker: "17:30 Uhr",
      title: "Early Entry Einlass",
      detail: "Bevorzugter Einlass für Inhaber:innen des Early Entry Pakets vor der regulären Türöffnung.",
    },
    {
      marker: "18:30 Uhr",
      title: "Regulärer Einlass",
      detail: "Öffnung der Uber Arena für alle Ticketkategorien und freie Platzwahl im Innenraum.",
    },
    {
      marker: "20:00 Uhr",
      title: "Support: Blond",
      detail: "Eröffnung des Konzertabends mit dem Live-Set der Chemnitzer Indie-Pop-Band Blond.",
    },
    {
      marker: "21:00 Uhr",
      title: "Kraftklub — Hauptshow",
      detail: "Volles Tour-Set mit Songs aus 'Karges Land', Klassikern und voller Bühnenproduktion.",
    },
    {
      marker: "ca. 23:00 Uhr",
      title: "Konzertende",
      detail: "Geplantes Veranstaltungsende und geordnete Abreise über den Uber Platz.",
    },
  ],
  "philharmonie-mahler-5": [
    {
      marker: "18:45 Uhr",
      title: "Foyer- & Saaleinlass",
      detail: "Öffnung des Foyers und der Garderoben in der Elbphilharmonie Hamburg.",
    },
    {
      marker: "19:00 Uhr",
      title: "Konzerteinführung",
      detail: "30-minütiges moderiertes Einführungsgespräch zu Mahlers 5. Sinfonie im Großen Saal.",
    },
    {
      marker: "19:30 Uhr",
      title: "Konzertbeginn: Adagietto",
      detail: "Eröffnung mit der Kammerfassung des Adagietto, NDR Elbphilharmonie Orchester.",
    },
    {
      marker: "ca. 20:15 Uhr",
      title: "Konzertpause",
      detail: "20 Minuten Pause im Foyer mit Blick über den Hamburger Hafen.",
    },
    {
      marker: "20:35 Uhr",
      title: "Gustav Mahler: 5. Sinfonie",
      detail: "Hauptwerk unter der Leitung von Chefdirigent Alan Gilbert.",
    },
    {
      marker: "ca. 21:45 Uhr",
      title: "Veranstaltungsende",
      detail: "Geplantes Konzertende und Saalausklang.",
    },
  ],
  "wacken-open-air": [
    {
      marker: "Mittwoch",
      title: "Anreise & Campingöffnung",
      detail: "Zeltplatzöffnung ab 10:00 Uhr und Start der kostenfreien Shuttlebusse ab Bahnhof Itzehoe.",
    },
    {
      marker: "Donnerstag",
      title: "Festivaleröffnung & Infield",
      detail: "Öffnung des Infields und Start der ersten Live-Shows auf den Wacken-Bühnen.",
    },
    {
      marker: "Freitag",
      title: "Hauptprogrammtag",
      detail: "Durchgehendes Metal-Programm auf Faster & Harder Stage sowie den Zeltbühnen.",
    },
    {
      marker: "Samstag",
      title: "Headliner-Tag & Finale",
      detail: "Große Headliner-Shows, Nachtprogramm und feierlicher Festivalabschluss bis Mitternacht.",
    },
    {
      marker: "Sonntag",
      title: "Abreise",
      detail: "Räumung der Zeltplätze und Abreiseverkehr bis in den Nachmittag.",
    },
  ],
  "fusion-festival": [
    {
      marker: "Mittwoch",
      title: "Geländeöffnung & Anreise",
      detail: "Einlass und Öffnung des Campinggeländes ab 10:00 Uhr auf dem Flugplatz Lärz.",
    },
    {
      marker: "Donnerstag",
      title: "Programmstart",
      detail: "Eröffnung der ersten Musikfloors, Kunstinstallationen, Theaterzelte und Workshops.",
    },
    {
      marker: "Freitag",
      title: "Festivalbetrieb",
      detail: "Durchgehendes Programm mit elektronischer Musik, Performance-Kunst und Live-Bands.",
    },
    {
      marker: "Samstag",
      title: "Hauptereignis & Nightlife",
      detail: "Volles Kultur- und Musikprogramm auf allen Arealen rund um die Uhr.",
    },
    {
      marker: "Sonntag",
      title: "Ausklang & Abreise",
      detail: "Abschluss-Sets am Vormittag und entspannte Abreise bis 12:00 Uhr.",
    },
  ],
  "schauspielhaus-faust": [
    {
      marker: "18:15 Uhr",
      title: "Foyer- & Saaleinlass",
      detail: "Öffnung des Foyers, Garderobe und Einlass in den Theatersaal.",
    },
    {
      marker: "19:00 Uhr",
      title: "Vorstellungsbeginn: Faust I",
      detail: "Goethes Klassiker in der gefeierten Inszenierung von Johan Simons.",
    },
    {
      marker: "ca. 20:20 Uhr",
      title: "Theaterpause",
      detail: "20 Minuten Pause im Foyer mit Getränkeangebot.",
    },
    {
      marker: "20:40 Uhr",
      title: "Zweiter Teil",
      detail: "Fortsetzung der Aufführung im Hauptsaal.",
    },
    {
      marker: "21:30 Uhr",
      title: "Publikumsgespräch",
      detail: "Moderiertes Nachgespräch mit Mitgliedern des Schauspielensembles im Foyer.",
    },
    {
      marker: "ca. 22:00 Uhr",
      title: "Veranstaltungsende",
      detail: "Ende des Theaterabends.",
    },
  ],
  "bundesliga-bvb-sge": [
    {
      marker: "13:30 Uhr",
      title: "Stadionöffnung",
      detail: "Öffnung der Drehkreuze im Signal Iduna Park, Einlasskontrollen und Catering an den Promenaden.",
    },
    {
      marker: "14:45 Uhr",
      title: "Aufwärmphase & Vorprogramm",
      detail: "Spieler beider Teams auf dem Rasen, Mannschaftsaufstellungen und Vereinshymnen.",
    },
    {
      marker: "15:30 Uhr",
      title: "Anpfiff: 1. Halbzeit",
      detail: "Start des 7. Bundesliga-Spieltags Borussia Dortmund gegen Eintracht Frankfurt.",
    },
    {
      marker: "16:15 Uhr",
      title: "Halbzeitpause",
      detail: "15 Minuten Pause mit Spielanalysen auf den Stadionleinwänden.",
    },
    {
      marker: "16:30 Uhr",
      title: "2. Halbzeit",
      detail: "Zweite Spielhälfte und Entscheidung des Spiels.",
    },
    {
      marker: "ca. 17:20 Uhr",
      title: "Abpfiff & Abreise",
      detail: "Spielende, Auslaufen der Teams und Abreise mit kostenfreier VRR-Nutzung.",
    },
  ],
  "berlin-marathon-startplatz": [
    {
      marker: "07:00 Uhr",
      title: "Geländeöffnung",
      detail: "Öffnung des Startareals auf der Straße des 17. Juni und Kleiderbeutel-Abgabe.",
    },
    {
      marker: "08:30 Uhr",
      title: "Startblock-Aufstellung",
      detail: "Einfinden in den persönlichen Startblöcken nach gemeldeter Bestzeit.",
    },
    {
      marker: "09:15 Uhr",
      title: "Startschuss Welle 1",
      detail: "Rennstart für Elite-Läufer:innen und erste Startwellen über 42,195 km.",
    },
    {
      marker: "09:35 Uhr",
      title: "Folgewellen",
      detail: "Zeitversetzter Start aller nachfolgenden Starterblöcke.",
    },
    {
      marker: "ab 11:20 Uhr",
      title: "Zieleinlauf & Finisher-Medaillen",
      detail: "Einlauf durch das Brandenburger Tor, Übergabe der Medaillen und Zielverpflegung.",
    },
    {
      marker: "15:30 Uhr",
      title: "Offizieller Zielschluss",
      detail: "Schluss der Zeitmessung und Ausklang im Zielgelände.",
    },
  ],
  "reise-nordlichter-tromsoe": [
    {
      marker: "Tag 1",
      title: "Flug & Ankunft in Tromsø",
      detail: "Flug ab Frankfurt am Main, Transfer und Check-in im zentralen Hotel in Tromsø.",
    },
    {
      marker: "Tag 2",
      title: "Arktische Fjordfahrt",
      detail: "Panoramafahrt mit dem leisen Hybridkatamaran durch die norwegischen Fjorde.",
    },
    {
      marker: "Tag 3",
      title: "Freizeit & 1. Nordlicht-Tour",
      detail: "Tag zur eigenen Gestaltung; abends geführte Aurora-Tour mit Thermoanzügen und Guide.",
    },
    {
      marker: "Tag 4",
      title: "Eismeerkathedrale & 2. Nordlicht-Tour",
      detail: "Stadtbesichtigung am Tag und zweite abendliche Polarlicht-Exkursion.",
    },
    {
      marker: "Tag 5",
      title: "Rückreise nach Frankfurt",
      detail: "Hotel-Check-out, Transfer zum Flughafen Tromsø und Rückflug nach Frankfurt am Main.",
    },
  ],
  "reise-toskana-weinwoche": [
    {
      marker: "Tag 1",
      title: "Ankunft im Chianti",
      detail: "Check-in im Agriturismo Le Vigne bei Greve in Chianti und Willkommens-Abendessen.",
    },
    {
      marker: "Tag 2",
      title: "Erste Weingutbesichtigung",
      detail: "Führung durch die historischen Reben und erste geführte Chianti-Classico-Verkostung.",
    },
    {
      marker: "Tag 3",
      title: "Toskanischer Kochkurs",
      detail: "Zubereitung traditioneller toskanischer Spezialitäten mit gemeinsamem Mittagessen.",
    },
    {
      marker: "Tag 4",
      title: "Tagesausflug nach Siena",
      detail: "Geführter Rundgang durch die historische Altstadt, Piazza del Campo und Dom.",
    },
    {
      marker: "Tag 5",
      title: "Weingüter & Olivenölprobe",
      detail: "Besuch von zwei familiengeführten Weingütern mit Verkostung regionaler Spitzenöle.",
    },
    {
      marker: "Tag 6",
      title: "Abreise",
      detail: "Gemeinsames Frühstück und individuelle Heimreise.",
    },
  ],
  "jazzclub-nightsession": [
    {
      marker: "20:00 Uhr",
      title: "Einlass & Platzierung",
      detail: "Öffnung des Stadtgartens Köln und Einnahme der reservierten Clubtische mit Service.",
    },
    {
      marker: "21:00 Uhr",
      title: "Set 1: Julia Hülsmann Quartett",
      detail: "Erster Konzertteil des Quartetts mit modernen europäischen Jazz-Kompositionen.",
    },
    {
      marker: "22:00 Uhr",
      title: "Setpause",
      detail: "30 Minuten Pause an den Clubtischen.",
    },
    {
      marker: "22:30 Uhr",
      title: "Set 2: Hauptperformance",
      detail: "Zweites Konzertset der Band mit Soli und Werkvorstellungen.",
    },
    {
      marker: "23:45 Uhr",
      title: "Offene Jam Session",
      detail: "Gemeinsame Jam Session mit Gastmusiker:innen der Kölner Szene.",
    },
    {
      marker: "ca. 01:00 Uhr",
      title: "Veranstaltungsende",
      detail: "Ausklang der Late Night Session.",
    },
  ],
  "museumsnacht-muenchen": [
    {
      marker: "18:30 Uhr",
      title: "Auftakt & Infostand",
      detail: "Eröffnung der Infopoints am Königsplatz und Ausgabe von Programmheften.",
    },
    {
      marker: "19:00 Uhr",
      title: "Museumsöffnung & Shuttle-Start",
      detail: "Gleichzeitige Öffnung aller 90 Häuser und Start des dichten Shuttlebus-Rundverkehrs.",
    },
    {
      marker: "20:00–23:00 Uhr",
      title: "Sonderführungen & Live-Programme",
      detail: "Kurzführungen, Konzerte, Lesungen und Mitmachaktionen in teilnehmenden Museen.",
    },
    {
      marker: "23:00–01:30 Uhr",
      title: "Nachtspecials & Lichtkunst",
      detail: "Lichtinstallationen und Sonderprogramme in den großen Ausstellungshäusern.",
    },
    {
      marker: "02:00 Uhr",
      title: "Veranstaltungsende",
      detail: "Schließung aller Häuser und letzte Rückfahrten der Shuttlebusse.",
    },
  ],
  "splash-hiphop-festival": [
    {
      marker: "Donnerstag",
      title: "Early Camp & Warm-up",
      detail: "Frühanreise für Festivalcamper und Eröffnung des Campingplatzes in Ferropolis.",
    },
    {
      marker: "Freitag",
      title: "Festivalauftakt",
      detail: "Bühnenöffnung mit ersten Live-Acts, DJ-Sets und Block-Parties.",
    },
    {
      marker: "Samstag",
      title: "Hauptbühnen & Strandbühne",
      detail: "Volles Programm auf Mainstage, Backyard Stage und am Badestrand mit Skate-Contests.",
    },
    {
      marker: "Sonntag",
      title: "Finale & Headliner",
      detail: "Große Headliner-Shows am Abend und Nachtprogramm bis in den frühen Morgen.",
    },
    {
      marker: "Montag",
      title: "Abreise",
      detail: "Zeltplatzschließung bis 14:00 Uhr und Rückreise per Shuttle nach Dessau und Gräfenhainichen.",
    },
  ],
  "open-air-kino-hafen": [
    {
      marker: "19:30 Uhr",
      title: "Einlass & Gastronomie",
      detail: "Öffnung des Kinoareals an der Nordmole, freie Platzwahl/Liegestühle und Deckenverleih.",
    },
    {
      marker: "20:30 Uhr",
      title: "Dämmerung & Vorprogramm",
      detail: "Kurze Einführung zur Filmreihe und Einstimmung bei Sonnenuntergang.",
    },
    {
      marker: "21:15 Uhr",
      title: "Filmstart: Perfect Days (OmU)",
      detail: "Filmbeginn auf der 12-Meter-Großleinwand unter freiem Himmel.",
    },
    {
      marker: "ca. 23:20 Uhr",
      title: "Filmende",
      detail: "Abspann und gemütlicher Ausklang am Hafenbecken.",
    },
    {
      marker: "23:30 Uhr",
      title: "Geländeschluss",
      detail: "Ende der Freiluftveranstaltung.",
    },
  ],
  "technoclub-warehouse-nacht": [
    {
      marker: "22:30 Uhr",
      title: "Einlass & Abendkasse",
      detail: "Öffnung des Kraftwerks Mitte mit getrennten Zugängen für Fast Lane und Vorverkauf.",
    },
    {
      marker: "23:00 Uhr",
      title: "Opening Sets",
      detail: "Lokale Support-DJs eröffnen den Keller-Floor und den Open-Air-Ambient-Hof.",
    },
    {
      marker: "01:00 Uhr",
      title: "Mainfloor Eröffnung",
      detail: "Start des Hauptfloors mit kraftvollem Soundsystem und Lichtkonzept.",
    },
    {
      marker: "03:30 Uhr",
      title: "Amelie Lens — Closing Set",
      detail: "Erweitertes DJ-Set der Headlinerin bis in den frühen Morgen.",
    },
    {
      marker: "bis 10:00 Uhr",
      title: "Afterhour & Ausklang",
      detail: "Morgendlicher Ausklang auf dem Keller- und Hof-Floor bis zur Schließung.",
    },
  ],
  "streetfood-markt-sonntag": [
    {
      marker: "10:30 Uhr",
      title: "Geländeöffnung",
      detail: "Einlass auf den Rheinwiesen Oberkassel in Düsseldorf.",
    },
    {
      marker: "11:00 Uhr",
      title: "Marktstart & Verkostung",
      detail: "Öffnung aller 40 Street-Food-Stände mit internationalen Spezialitäten.",
    },
    {
      marker: "12:00 Uhr",
      title: "Kinderprogramm",
      detail: "Start der Bastel- und Spielzelte für Familien und Kinder.",
    },
    {
      marker: "14:00 Uhr",
      title: "Live-Bands am Rheinufer",
      detail: "Akustische Live-Musik und Singer-Songwriter auf der Bühne.",
    },
    {
      marker: "18:00 Uhr",
      title: "Sundowner-Session",
      detail: "Entspannte Musik und Street Food zum Sonnenuntergang über dem Rhein.",
    },
    {
      marker: "20:00 Uhr",
      title: "Marktende",
      detail: "Geplantes Veranstaltungsende.",
    },
  ],
  "handball-thw-kiel-rn-loewen": [
    {
      marker: "16:30 Uhr",
      title: "Hallenöffnung",
      detail: "Einlass in die Wunderino Arena, Fanzone und Gastronomie (bargeldlos).",
    },
    {
      marker: "17:15 Uhr",
      title: "Aufwärmen beider Teams",
      detail: "Warm-up auf dem Spielfeld und Torwart-Einwerfen.",
    },
    {
      marker: "17:45 Uhr",
      title: "Mannschaftspräsentation",
      detail: "Einlauf der Bundesligamannschaften mit Hallenshow und Hymne.",
    },
    {
      marker: "18:00 Uhr",
      title: "Anwurf: 1. Halbzeit",
      detail: "Beginn des Spitzenspiels THW Kiel gegen Rhein-Neckar Löwen.",
    },
    {
      marker: "18:40 Uhr",
      title: "Halbzeitpause",
      detail: "15 Minuten Pause mit Fan-Aktionen auf dem Hallenboden.",
    },
    {
      marker: "18:55 Uhr",
      title: "2. Halbzeit",
      detail: "Entscheidung der Partie in der Schlussphase.",
    },
    {
      marker: "ca. 19:50 Uhr",
      title: "Spielende & Ehrenrunde",
      detail: "Schlusssirene, Verabschiedung der Mannschaften und Abreise.",
    },
  ],
  "oktoberfest-zeltreservierung": [
    {
      marker: "16:30 Uhr",
      title: "Reservierungseinlass",
      detail: "Einlass über den reservierten Eingang am Festzelt Schottenhamel.",
    },
    {
      marker: "17:00 Uhr",
      title: "Tischübernahme & Verzehr",
      detail: "Einnahme der gebuchten Abendbox und Ausgabe der Wertmarken für Maß & Hendl.",
    },
    {
      marker: "18:00 Uhr",
      title: "Festzeltmusik",
      detail: "Traditionelle Blasmusik und Bierzelt-Klassiker der Festkapelle.",
    },
    {
      marker: "21:00 Uhr",
      title: "Stimmungs-Höhepunkt",
      detail: "Wiesn-Hits und ausgelassenes Feiern in den Boxen und Gängen.",
    },
    {
      marker: "22:30 Uhr",
      title: "Letzte Ausschankrunde",
      detail: "Letzte Bestellmöglichkeit für Speisen und Getränke.",
    },
    {
      marker: "23:00 Uhr",
      title: "Zeltleerung",
      detail: "Ende der Abendschicht und geordnete Zelträumung.",
    },
  ],
  "comedy-mixed-show": [
    {
      marker: "19:00 Uhr",
      title: "Einlass & Barbetrieb",
      detail: "Öffnung des Kesselhauses in der Berliner Kulturbrauerei und Platzierung.",
    },
    {
      marker: "20:00 Uhr",
      title: "Showbeginn: Teil 1",
      detail: "Moderationseröffnung und die ersten drei Comedians der Mixed Show.",
    },
    {
      marker: "ca. 21:00 Uhr",
      title: "Pause",
      detail: "20 Minuten Erfrischungspause im Foyer.",
    },
    {
      marker: "21:20 Uhr",
      title: "Showbeginn: Teil 2",
      detail: "Zweiter Teil der Stand-up-Sets und moderierte Zugabenrunde mit allen Acts.",
    },
    {
      marker: "ca. 22:30 Uhr",
      title: "Showende",
      detail: "Ende der Show und Foyer-Ausklang.",
    },
  ],
  "reise-lissabon-staedtetrip": [
    {
      marker: "Tag 1",
      title: "Flug & Ankunft Baixa",
      detail: "Flug ab Berlin (BER) nach Lissabon, Transfer zum Boutiquehotel und Orientierungsrundgang.",
    },
    {
      marker: "Tag 2",
      title: "Alfama & Fado-Abend",
      detail: "Geführter Spaziergang durch die Altstadtgassen von Alfama mit traditionellem Fado-Dinner.",
    },
    {
      marker: "Tag 3",
      title: "Tagesausflug nach Sintra",
      detail: "Bahnfahrt und geführte Besichtigung der Schlossanlagen und Gärten in Sintra.",
    },
    {
      marker: "Tag 4",
      title: "Belém & Rückflug",
      detail: "Besuch des Torre de Belém, Transfer zum Flughafen und Rückflug nach Berlin.",
    },
  ],
  "weihnachtsmarkt-nuernberg-fuehrung": [
    {
      marker: "17:15 Uhr",
      title: "Treffpunkt Hauptmarkt",
      detail: "Begrüßung durch den Guide am Treffpunkt vor dem Christkindlesmarkt Nürnberg.",
    },
    {
      marker: "17:30 Uhr",
      title: "Führungsbeginn",
      detail: "Rundgang zu historischen Stationen und Geschichten rund um das Nürnberger Christkind.",
    },
    {
      marker: "18:00 Uhr",
      title: "Handwerksstationen",
      detail: "Exklusiver Halt bei einer traditionellen Lebkuchenbäckerei und einer Zinnfigurenwerkstatt.",
    },
    {
      marker: "18:40 Uhr",
      title: "Glühweinstopp",
      detail: "Gemeinsamer Heißgetränk-Stopp (Glühwein oder Punsch) an ausgewählten Ständen.",
    },
    {
      marker: "19:00 Uhr",
      title: "Führungsende",
      detail: "Abschluss der Tour und Gelegenheit für weiteren privaten Marktbesuch.",
    },
  ],
  "silvester-tanz-in-den-jahreswechsel": [
    {
      marker: "18:15 Uhr",
      title: "Festlicher Empfang",
      detail: "Einlass in das Kurhaus Wiesbaden mit Begrüßungscocktail im Foyer.",
    },
    {
      marker: "19:00 Uhr",
      title: "4-Gänge-Galadinner",
      detail: "Serviertes Viergangmenü im festlich geschmückten großen Saal.",
    },
    {
      marker: "21:00 Uhr",
      title: "Tanzmusik & Hausbigband",
      detail: "Eröffnung der Tanzfläche mit der 17-köpfigen Kurhaus-Big-Band.",
    },
    {
      marker: "23:45 Uhr",
      title: "Terrassen-Sammlung",
      detail: "Gemeinsames Anstoßen mit Mitternachtssekt auf der Kurhaus-Terrasse.",
    },
    {
      marker: "00:00 Uhr",
      title: "Mitternachtsfeuerwerk",
      detail: "Feuerwerk über dem Kurpark und Neujahrsbegrüßung.",
    },
    {
      marker: "bis 03:00 Uhr",
      title: "Ballnacht & Late Lounge",
      detail: "Tanzmusik und Bardienst bis in die frühen Morgenstunden.",
    },
  ],
  "ski-alpin-weltcup-garmisch": [
    {
      marker: "08:30 Uhr",
      title: "Shuttle-Start & Einlass",
      detail: "Shuttlebus-Takt ab Bahnhof Garmisch-Partenkirchen und Öffnung des Zielstadions.",
    },
    {
      marker: "10:00 Uhr",
      title: "Vorprogramm & Fanmeile",
      detail: "Moderation, Musik und Vorstellung der Startliste im Zielbereich.",
    },
    {
      marker: "11:30 Uhr",
      title: "Start der Herrenabfahrt",
      detail: "Start des ersten Läufers auf der anspruchsvollen Kandahar-Strecke.",
    },
    {
      marker: "13:30 Uhr",
      title: "Rennentscheidung",
      detail: "Letzte Starter im Ziel und Feststehen der Podestplätze.",
    },
    {
      marker: "14:15 Uhr",
      title: "Offizielle Siegerehrung",
      detail: "Pokalübergabe und Champagnerzeremonie im Zielstadion.",
    },
    {
      marker: "15:00 Uhr",
      title: "Veranstaltungsende",
      detail: "Rücktransfer per Shuttle zum Bahnhof Garmisch-Partenkirchen.",
    },
  ],
  "rock-am-ring-2027": [
    {
      marker: "Donnerstag",
      title: "Anreise & Zeltplatzbezug",
      detail: "Campingplätze ab 12:00 Uhr zugänglich, Bändchentausch an den Stationen am Ring.",
    },
    {
      marker: "Freitag",
      title: "Festivaltag 1",
      detail: "Öffnung aller 4 Bühnen und Start des Rockprogramms ab 12:00 Uhr mittags.",
    },
    {
      marker: "Samstag",
      title: "Festivaltag 2",
      detail: "Ganztägiges Live-Programm mit internationalen Headlinern bis spät in die Nacht.",
    },
    {
      marker: "Sonntag",
      title: "Festivaltag 3 & Finale",
      detail: "Letzter Festivaltag mit Rock-Highlights und Abschlussshows bis Mitternacht.",
    },
    {
      marker: "Montag",
      title: "Abreise",
      detail: "Zeltplatzräumung und Rückreise bis zum Mittag.",
    },
  ],
  "tatort-lesung-hafenkrimi": [
    {
      marker: "18:30 Uhr",
      title: "Boarding am Frachtsegler",
      detail: "Einlass an Bord des restaurierten Seglers im Museumshafen Oevelgönne und Deckenvergabe.",
    },
    {
      marker: "19:00 Uhr",
      title: "Lesungsteil 1",
      detail: "Begrüßung und erste Passagen des Kriminalromans an Deck.",
    },
    {
      marker: "19:50 Uhr",
      title: "Musikalische Pause",
      detail: "Traditionelle Seemannslieder und Getränke an Bord.",
    },
    {
      marker: "20:10 Uhr",
      title: "Lesungsteil 2 & Finale",
      detail: "Spannender Schlussteil der Kriminalgeschichte.",
    },
    {
      marker: "21:00 Uhr",
      title: "Signierstunde & Ausklang",
      detail: "Möglichkeit für persönliche Signierungen und Verabschiedung.",
    },
  ],
  "reise-wandern-suedtirol": [
    {
      marker: "Tag 1",
      title: "Treffpunkt Bozen & Aufstieg",
      detail: "Begrüßung am Bahnhof Bozen, Gepäcktransport-Koordination und Wanderung zur ersten Hütte.",
    },
    {
      marker: "Tag 2–3",
      title: "Seiser Alm & Schlern-Massiv",
      detail: "Geführte Panorama-Etappen mit Bergführer über die weitläufigen Almflächen.",
    },
    {
      marker: "Tag 4",
      title: "Plattkofel & Höhenweg",
      detail: "Rundwanderung um den markanten Plattkofel mit alpiner Aussicht.",
    },
    {
      marker: "Tag 5–6",
      title: "Rosengarten Schutzhütten",
      detail: "Zweitagespassage im Rosengarten-Gebiet mit Halbpension auf den Berghütten.",
    },
    {
      marker: "Tag 7",
      title: "Abstieg & Abreise",
      detail: "Abschlussetappe ins Tal, Transfer zurück zum Bahnhof Bozen und Heimreise.",
    },
  ],
  "arena-tour-annenmaykantereit": [
    {
      marker: "18:30 Uhr",
      title: "Einlass Lanxess Arena",
      detail: "Öffnung der Arena Köln für alle Steh- und Sitzplatzbereiche.",
    },
    {
      marker: "19:45 Uhr",
      title: "Saaleinstimmung",
      detail: "Übergang zum Konzertbeginn und Einstimmung des Publikums.",
    },
    {
      marker: "20:00 Uhr",
      title: "AnnenMayKantereit Live",
      detail: "Zweistündiges Konzertset zusammen mit dem vierköpfigen Streicherensemble.",
    },
    {
      marker: "21:45 Uhr",
      title: "Zugabenblock",
      detail: "Akustische Zugaben und Fan-Favoriten.",
    },
    {
      marker: "ca. 22:30 Uhr",
      title: "Konzertende",
      detail: "Geplantes Showende und Abreise.",
    },
  ],
  "basketball-euroleague-bayern": [
    {
      marker: "18:30 Uhr",
      title: "Einlass SAP Garden",
      detail: "Öffnung der Halle zwei Stunden vor Spielbeginn mit Foyer-, Gastronomie- und Fanshop-Zugang.",
    },
    {
      marker: "19:45 Uhr",
      title: "Warm-up & Shootaround",
      detail: "Aufwärmen beider EuroLeague-Teams auf dem Parkett.",
    },
    {
      marker: "20:20 Uhr",
      title: "Starting Five & Show",
      detail: "Lichtinszenierung und offizielle Vorstellung der Startaufstellungen.",
    },
    {
      marker: "20:30 Uhr",
      title: "Tip-off: 1. Halbzeit",
      detail: "Spielstart FC Bayern Basketball gegen Real Madrid (Viertel 1 & 2).",
    },
    {
      marker: "ca. 21:20 Uhr",
      title: "Halbzeitpause",
      detail: "15 Minuten Show- und Tanzprogramm auf dem Spielfeld.",
    },
    {
      marker: "21:35 Uhr",
      title: "2. Halbzeit",
      detail: "Viertel 3 & 4 und Schlussphase.",
    },
    {
      marker: "ca. 22:30 Uhr",
      title: "Spielende",
      detail: "Schlusssirene, Interviews und Ausklang im SAP Garden.",
    },
  ],
}

function eventScheduleFallback(event: EventItem): readonly EventScheduleItem[] {
  const doorsLabel = event.doorsAt ? eventTimeFormat(event.doorsAt) : undefined
  const startLabel = eventTimeFormat(event.startsAt)
  const endLabel = event.endsAt ? eventTimeFormat(event.endsAt) : undefined

  if (event.category === "festivals") {
    return [
      {
        marker: doorsLabel ?? "Tag 1",
        title: "Anreise & Campingöffnung",
        detail: "Zutritt zum Gelände und Bezug der Zeltplätze.",
      },
      {
        marker: startLabel,
        title: "Festivaleröffnung & Bühnenstart",
        detail: "Offizieller Start des Festival- und Konzertprogramms.",
      },
      ...(endLabel
        ? [
            {
              marker: endLabel,
              title: "Festivalfinale & Abreise",
              detail: "Abschluss der Shows und Abreise vom Festivalgelände.",
            },
          ]
        : []),
    ]
  }

  if (event.category === "reisen") {
    return [
      {
        marker: "Tag 1",
        title: "Anreise & Willkommen",
        detail: `Ankunft und Check-in für ${event.title}.`,
      },
      {
        marker: "Folgetage",
        title: "Geführtes Programm & Erkundung",
        detail: "Geplante Programmpunkte und Tagesaktivitäten laut Reisebeschreibung.",
      },
      {
        marker: "Abreisetag",
        title: "Abschluss & Heimreise",
        detail: "Check-out und individuelle oder organisierte Rückreise.",
      },
    ]
  }

  return [
    ...(doorsLabel
      ? [
          {
            marker: doorsLabel,
            title: "Einlass & Hallenöffnung",
            detail: `Einlass zur Spielstätte ${event.venue}.`,
          },
        ]
      : []),
    {
      marker: startLabel,
      title: "Veranstaltungsbeginn",
      detail: `Start von ${event.title}.`,
    },
    ...(endLabel
      ? [
          {
            marker: `ca. ${endLabel}`,
            title: "Geplantes Ende",
            detail: "Voraussichtliches Ende des Programms.",
          },
        ]
      : []),
  ]
}

export function eventScheduleGet(event: EventItem): readonly EventScheduleItem[] {
  const exact = mockScheduleById[event.id]
  if (exact && exact.length > 0) {
    return exact
  }

  return eventScheduleFallback(event)
}
