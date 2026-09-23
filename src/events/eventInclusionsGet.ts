import type { EventItem } from "./EventItem.ts"

const mockInclusionsById: Record<string, readonly string[]> = {
  "kraftklub-arena-berlin": [
    "Offizielles Eintrittsticket für Kraftklub — Karges Land Tour in der Uber Arena Berlin",
    "Zugang zum gebuchten Bereich (Innenraum Stehplatz, nummerierter Oberrang Sitzplatz oder Early Entry Paket)",
    "Live-Konzert von Kraftklub inklusive Support-Auftritt von Blond",
    "Digitales Wallet-Ticket für den kontaktlosen Einlass-Scan",
  ],
  "philharmonie-mahler-5": [
    "Eintrittskarte für Gustav Mahlers 5. Sinfonie im Großen Saal der Elbphilharmonie Hamburg",
    "Platzierung im gewählten Bereich laut gebuchter Preiskategorie (Kategorie A oder Kategorie C)",
    "Zugang zum 30-minütigen Konzertgespräch zur Einführung vor Beginn",
    "Digitales Ticket zur schnellen Vorlage am Einlass",
  ],
  "wacken-open-air": [
    "3-Tage-Festivalpass für das Wacken Open Air 2026",
    "Zugang zu allen 6 Bühnen mit über 70 Live-Bands auf dem Festivalgelände",
    "Campingplatz-Nutzung ab Mittwoch inklusive",
    "Kostenloser Shuttlebus-Transfer vom und zum Bahnhof Itzehoe",
    "Mobiles Ticket zur direkten Festivalbändchen-Ausgabe vor Ort",
  ],
  "fusion-festival": [
    "4-Tage-Festivalpass für das gesamte Fusion Festival am Flugplatz Lärz",
    "Zutritt zu allen Musikbühnen, Theater-, Zirkus- und Performance-Arealen",
    "Freie Campingplatz-Nutzung auf dem Festivalgelände für die gesamte Festivaldauer",
    "Personalisiertes Ticket für den Einlass-Check-in",
  ],
  "schauspielhaus-faust": [
    "Eintrittskarte zur Theateraufführung von Johan Simons' Faust I im Schauspielhaus Bochum",
    "Sitzplatzierung im Parkett (Reihen 3–12) oder ermäßigter Einlassplatz",
    "Teilnahme am moderierten Publikumsgespräch mit dem Ensemble im Foyer",
    "Digitales Ticket zur Vorlage am Saaleinlass",
  ],
  "bundesliga-bvb-sge": [
    "Offizielle Eintrittskarte für das Bundesliga-Spiel im Signal Iduna Park Dortmund",
    "Zugang zum gebuchten Block (Südtribüne Stehplatz oder überdachter Haupttribüne Sitzplatz)",
    "KombiTicket: Kostenfreie Hin- und Rückfahrt im gesamten VRR-Gebiet (3 Std. vor bis 3 Std. nach dem Spiel)",
    "Mobiles Ticket für den schnellen Drehkreuz-Scan",
  ],
  "berlin-marathon-startplatz": [
    "Offizieller Startplatz für den 42,195 km BMW Berlin-Marathon auf der Straße des 17. Juni",
    "Startblockzuteilung nach Bestzeit inklusive offizieller elektronischer Zeitmessung",
    "Streckenverpflegung und medizinische Betreuung entlang des gesamten Kurses",
    "Exklusives Finisher-Shirt und offizielle Teilnehmer-Medaille nach dem Zieleinlauf",
    "Abholberechtigung für die Startunterlagen auf der Marathon-Messe",
  ],
  "reise-nordlichter-tromsoe": [
    "Hin- und Rückflug ab Frankfurt am Main nach Tromsø (Norwegen)",
    "4 Übernachtungen im Hotel im Zentrum von Tromsø im gewählten Zimmer inklusive Frühstück",
    "2 geführte Nordlicht-Touren mit erfahrenen Guides inklusive Thermoanzügen",
    "Fjordfahrt mit dem modernen Hybridkatamaran",
    "Vollständige digitale Reiseunterlagen und Buchungsbestätigung im Eventoren-Konto",
  ],
  "reise-toskana-weinwoche": [
    "6 Nächte im Agriturismo Le Vigne bei Greve in Chianti inklusive Halbpension",
    "3 geführte Weinverkostungen auf ausgewählten, familiengeführten Weingütern",
    "Kochkurs für traditionelle toskanische Küche",
    "Geführter Tagesausflug nach Siena in kleiner Gruppe",
    "Detaillierte Reisebestätigung und Reiseinformationen vorab",
  ],
  "jazzclub-nightsession": [
    "Eintrittskarte zur Late Night Session mit dem Julia Hülsmann Quartett (zwei Sets)",
    "Reservierter Sitzplatz an Clubtischen im Stadtgarten Köln mit Tischservice",
    "Freier Zugang zur anschließenden offenen Jam Session",
    "Digitales Einlassticket zur Vorlage auf dem Smartphone",
  ],
  "museumsnacht-muenchen": [
    "Kombiticket für über 90 Museen, Galerien und Sammlungen in München (19:00 bis 02:00 Uhr)",
    "Kostenlose Nutzung aller offiziellen Shuttlebuslinien zwischen den Standorten",
    "Digitales Programmheft und Tourenübersicht",
    "Mobiles Ticket für den unkomplizierten Einlass in allen Häusern",
  ],
  "splash-hiphop-festival": [
    "3-Tage-Festivalpass für das splash! Festival auf der Halbinsel Ferropolis",
    "Zugang zu allen Rap-Bühnen, dem Badestrand am Gremminer See und dem Skatepark",
    "Campingplatz-Nutzung während der gesamten Festivaltage",
    "Digitales Ticket zur Bändchenausgabe vor Ort",
  ],
  "open-air-kino-hafen": [
    "Eintritt zur Freiluft-Filmvorführung von Perfect Days (OmU) auf der 12-Meter-Leinwand",
    "Platzierung nach gebuchter Kategorie (reservierter Liegestuhl oder freie Wiesenplatzwahl)",
    "Kostenlose Bereitstellung wärmender Decken vor Ort",
    "Digitales Ticket für den schnellen Einlass am Zollhafen Mainz",
  ],
  "technoclub-warehouse-nacht": [
    "Eintritt zur Warehouse Night mit Amelie Lens im Kraftwerk Mitte Berlin (ab 18 Jahren)",
    "Voller Zugang zu allen drei Floors (Mainfloor, Keller und Ambient-Hof)",
    "Einlass über den gebuchten Zugang (inkl. Fast-Lane-Zugang bei Buchung der Fast Lane)",
    "Mobiles Ticket für den Einlass-Scan",
  ],
  "streetfood-markt-sonntag": [
    "Ganztägiger Eintritt zum Street Food Markt auf den Rheinwiesen Oberkassel Düsseldorf",
    "Zugang zu über 40 internationalen Marktständen und kulinarischen Stationen",
    "Freier Zutritt zu den Livemusik-Bühnen und zum Bastel- und Aktionszelt für Kinder",
    "Digitales Tagesticket",
  ],
  "handball-thw-kiel-rn-loewen": [
    "Eintrittskarte zum Handball-Bundesliga Spitzenspiel in der Wunderino Arena Kiel",
    "Platz im gebuchten Bereich (Stehplatz Nordkurve Fanblock oder Sitzplatz Mittelblock)",
    "Halleneinlass ab 90 Minuten vor Anwurf",
    "Mobiles Ticket für den kontaktlosen Drehkreuz-Scan",
  ],
  "oktoberfest-zeltreservierung": [
    "Feste Tischreservierung im Festzelt Schottenhamel (Abendbox für 10 Personen, 17:00–23:00 Uhr)",
    "10 Verzehrmarken für je eine Maß Festbier und 10 Gutscheine für ein halbes Wiesn-Hendl",
    "Garantierter Zelteinlass zur reservierten Schicht für die gesamte Gruppe",
    "Offizieller Reservierungsnachweis zur Vorlage am Eingang",
  ],
  "comedy-mixed-show": [
    "Eintrittskarte zur Quatsch Comedy Mixed Show im Kesselhaus der Kulturbrauerei Berlin",
    "Live-Auftritt von 5 Stand-up-Comedians inklusive Moderation und Zugaberunde",
    "Platzierung nach gebuchter Preiskategorie (nummerierter Stuhl vorne oder freie Stehplatzwahl)",
    "Digitales Ticket zur Vorlage am Saaleinlass",
  ],
  "reise-lissabon-staedtetrip": [
    "Hin- und Rückflug ab Berlin Brandenburg (BER) nach Lissabon",
    "3 Übernachtungen im Boutiquehotel in der Baixa inklusive täglichem Frühstück",
    "Geführter Stadtrundgang durch das Viertel Alfama mit traditionellem Fado-Abend",
    "Tagesausflug nach Sintra inklusive Bahnfahrt",
    "Digitale Reiseunterlagen und 24/7 Buchungsbestätigung",
  ],
  "weihnachtsmarkt-nuernberg-fuehrung": [
    "90-minütiger geführter Rundgang über den Nürnberger Christkindlesmarkt in der Kleingruppe",
    "Exklusive Stationen bei einer Lebkuchenbäckerei und einer Zinnfigurenwerkstatt",
    "Ein Heißgetränk (Glühwein oder alkoholfreier Punsch) inklusive",
    "Digitaler Buchungsbeleg zur Vorlage am Treffpunkt Hauptmarkt",
  ],
  "silvester-tanz-in-den-jahreswechsel": [
    "Eintrittskarte zum Silvesterball im historischen Kurhaus Wiesbaden",
    "4-Gänge-Menü ab 19:00 Uhr und Mitternachtssekt auf der Kurhaus-Terrasse",
    "Tanzmusik und Live-Programm mit der 17-köpfigen Hausbigband",
    "Exklusiver Ausblick auf das Mitternachtsfeuerwerk",
    "Digitales Ticket für den festlichen Einlass",
  ],
  "ski-alpin-weltcup-garmisch": [
    "Offizielles Tagesticket für das Herren-Abfahrtsrennen an der Kandahar-Strecke",
    "Zugang zum Kandahar-Zielstadion (freie Stehplatzwahl oder nummerierter Zieltribünensitz)",
    "Teilnahme an der offiziellen Siegerehrung im Zielbereich",
    "Kostenlose Nutzung des Shuttlebusses ab/bis Bahnhof Garmisch-Partenkirchen",
    "Mobiles Ticket für die Eingangskontrolle",
  ],
  "rock-am-ring-2027": [
    "3-Tage-Festivalpass für Rock am Ring 2027 am Nürburgring",
    "Zugang zu allen 4 Konzertbühnen mit über 80 Live-Bands",
    "Campingplatz-Berechtigung (Standard- oder Green-Camping je nach Ticketkategorie)",
    "Digitales Handyticket zum direkten Bändchentausch bei der Anreise",
  ],
  "tatort-lesung-hafenkrimi": [
    "Eintritt zur 2-stündigen Krimilesung an Deck des historischen Frachtseglers im Museumshafen Oevelgönne",
    "Live-Lesung mit musikalischer Begleitung durch Seemannslieder",
    "Bereitstellung von wärmenden Decken an Deck",
    "Digitales Ticket zur Vorlage beim Boarding",
  ],
  "reise-wandern-suedtirol": [
    "6 geführte Tageswanderungen rund um die Seiser Alm mit staatlich geprüftem Bergführer",
    "6 Übernachtungen auf Berghütten (Mehrbettlager oder Doppelzimmer) inklusive Halbpension",
    "Zuverlässiger Gepäcktransport von Hütte zu Hütte",
    "Digitale Reisebestätigung und Ausrüstungs-Checkliste vorab",
  ],
  "arena-tour-annenmaykantereit": [
    "Offizielles Ticket für das AnnenMayKantereit Konzert in der Lanxess Arena Köln",
    "Zweistündiges Live-Konzert mit vierköpfigem Streicherensemble",
    "Platz im gebuchten Bereich (Innenraum Stehplatz, Unterrang oder Oberrang Sitzplatz)",
    "Digitales Wallet-Ticket für den kontaktlosen Einlass",
  ],
  "basketball-euroleague-bayern": [
    "Offizielle Eintrittskarte für das EuroLeague-Hauptrundenspiel FC Bayern Basketball gegen Real Madrid",
    "Sitzplatz in der gewählten Kategorie im SAP Garden München (Oberrang oder Courtside inkl. Catering)",
    "Hallenzugang ab 2 Stunden vor Tip-off",
    "Mobiles Ticket für den schnellen Drehkreuz-Scan",
  ],
}

function eventInclusionsFallback(event: EventItem): readonly string[] {
  const categorySpecific: Record<EventItem["category"], readonly string[]> = {
    konzerte: [
      `Offizielles Eintrittsticket für ${event.title} in der Spielstätte ${event.venue}`,
      "Zugang zum gebuchten Platz- oder Stehplatzbereich laut Ticketkategorie",
      "Digitales Ticket für den schnellen Einlass-Scan",
    ],
    festivals: [
      `Festivalpass für ${event.title} auf dem Gelände ${event.venue}`,
      "Zutritt zu den Festivalbühnen und zum Veranstaltungsprogramm",
      "Mobiles Ticket zum Bändchentausch vor Ort",
    ],
    sport: [
      `Offizielles Ticket für ${event.title} in der Spielstätte ${event.venue}`,
      "Zugang zum gebuchten Block- oder Tribünenbereich",
      "Digitales Ticket für die kontaktlose Einlasskontrolle",
    ],
    kultur: [
      `Eintrittskarte für ${event.title} in ${event.venue}`,
      "Zugang zum gesamten Programmbereich laut gewählter Ticketkategorie",
      "Digitales Ticket zur Vorlage am Einlass",
    ],
    reisen: [
      `Buchungsbestätigung für ${event.title}`,
      "Detaillierte Reiseunterlagen und gebuchte Programmpunkte",
      "Digitaler Buchungsnachweis direkt im Eventoren-Konto",
    ],
  }

  return (
    categorySpecific[event.category] ?? [
      `Offizielles Eintrittsticket für ${event.title} in ${event.venue}`,
      "Gültiger Einlass für den gebuchten Zeitraum",
      "Digitales Ticket direkt im Eventoren-Konto",
    ]
  )
}

export function eventInclusionsGet(event: EventItem): readonly string[] {
  if (event.inclusions !== undefined) return event.inclusions
  const exact = mockInclusionsById[event.id]
  if (exact && exact.length > 0) {
    return exact
  }

  return eventInclusionsFallback(event)
}
