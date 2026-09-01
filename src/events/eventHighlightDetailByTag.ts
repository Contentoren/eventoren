import type { EventHighlightDetail } from "./EventHighlightDetail.ts"

const tagDetailMap: Record<string, { descriptor: string; detail: string }> = {
  Indie: {
    descriptor: "Musikrichtung & Sound",
    detail: "Unabhängiger Gitarrensound und eingängige Melodien prägen das Programm dieses Auftritts.",
  },
  Rock: {
    descriptor: "Musikrichtung & Sound",
    detail: "Kraftvolle Live-Performance mit energiegeladenen Riffs, Drums und mitreißender Bühnenpräsenz.",
  },
  Klassik: {
    descriptor: "Musikalisches Meisterwerk",
    detail: "Ein hochkarätiges Konzertprogramm mit klassischem Repertoire in meisterhafter Orchesterbesetzung.",
  },
  Sinfonie: {
    descriptor: "Orchesterwerk in voller Besetzung",
    detail: "Vielschichtiges sinfonisches Großwerk mit herausragender Akustik und Dynamik im Konzertsaal.",
  },
  Konzerteinführung: {
    descriptor: "Vorprogramm & Werkgespräch",
    detail: "Kompakte Einführung vor Konzertbeginn mit spannenden Hintergrundinformationen zu Werk und Komposition.",
  },
  Metal: {
    descriptor: "Musikrichtung & Sound",
    detail: "Harte Riffs, druckvolle Bässe und eine intensive Live-Atmosphäre auf der Festivalbühne.",
  },
  Camping: {
    descriptor: "Unterkunft auf dem Gelände",
    detail: "Zeltplatz direkt auf dem Veranstaltungsgelände während des gesamten Eventzeitraums inklusive.",
  },
  Elektro: {
    descriptor: "Elektronische Klangwelten",
    detail: "Treibende Beats, DJ-Sets und elektronische Klanglandschaften auf liebevoll kuratierten Floors.",
  },
  Performance: {
    descriptor: "Bühnen- & Aktionskunst",
    detail: "Künstlerische Darbietungen, Zirkus- und Theaterformate abseits klassischer Konzertkonzepte.",
  },
  Losverfahren: {
    descriptor: "Faire Ticketvergabe",
    detail:
      "Zugangsberechtigungen werden für maximale Chancengleichheit über ein transparentes Vergabesystem verteilt.",
  },
  Theater: {
    descriptor: "Bühneninszenierung",
    detail: "Schauspiel mit hochkarätigem Ensemble auf traditionsreicher Theaterbühne.",
  },
  Klassiker: {
    descriptor: "Literarisches Meisterwerk",
    detail: "Zeitlose Erzählung in moderner, eindringlicher Inszenierung mit starkem Bühnenbild.",
  },
  Publikumsgespräch: {
    descriptor: "Austausch im Anschluss",
    detail: "Offenes Nachgespräch im Foyer mit Regie und Ensemble direkt im Anschluss an die Vorstellung.",
  },
  Fußball: {
    descriptor: "Spitzensport live",
    detail: "Packende Stadionatmosphäre mit tausenden Fans und Spitzenfußball auf höchstem Niveau.",
  },
  Bundesliga: {
    descriptor: "Höchste deutsche Spielklasse",
    detail: "Offizielles Punktspiel im traditionsreichen deutschen Ligawettbewerb.",
  },
  "ÖPNV inklusive": {
    descriptor: "Kombiticket für den Nahverkehr",
    detail:
      "Die Eintrittskarte gilt am Veranstaltungstag als Fahrschein für An- und Abreise im gesamten Verbundgebiet.",
  },
  Laufen: {
    descriptor: "Sportlicher Wettkampf",
    detail: "Offizieller Laufwettbewerb mit abgesicherter Streckenführung, Verpflegung und sportlicher Wertung.",
  },
  Marathon: {
    descriptor: "Königsdisziplin über 42,195 km",
    detail: "Klassische Marathondistanz quer durch die Stadt inklusive Finisher-Medaille und Zielverpflegung.",
  },
  Zeitmessung: {
    descriptor: "Offizielle Chip-Erfassung",
    detail: "Präzise Nettozeitmessung mit Transponder für offizielle Bestenlisten und persönliche Finisher-Urkunden.",
  },
  Reise: {
    descriptor: "Kuratierte Erlebnisreise",
    detail: "Rundum organisiertes Reiseprogramm mit ausgewählten Unterkünften und erfahrener Leitung vor Ort.",
  },
  "Flug inklusive": {
    descriptor: "Anreise per Flugverbindung",
    detail: "Hin- und Rückflug ab ausgewählten deutschen Flughäfen sind bereits im Gesamtpreis enthalten.",
  },
  Kulinarik: {
    descriptor: "Regionale Spezialitäten & Genuss",
    detail: "Verkostungen lokaler Spezialitäten, Menüs oder Streetfood-Angebote mit frischen Zutaten.",
  },
  Kleingruppe: {
    descriptor: "Persönliche Gruppengröße",
    detail: "Exklusives Erlebnis in überschaubarer Runde für individuelle Betreuung und entspannte Atmosphäre.",
  },
  Jazz: {
    descriptor: "Improvisation & Groove",
    detail: "Fein abgestimmte Club-Akustik, erstklassige Musiker:innen und Raum für spontane Soli.",
  },
  "Late Night": {
    descriptor: "Spätabendliche Club-Atmosphäre",
    detail: "Intime Nachtsession bei gedimmtem Licht und entspannter Club-Stimmung bis in die Nacht.",
  },
  "Jam Session": {
    descriptor: "Spontanes Zusammenspiel",
    detail: "Offene Session im Anschluss an das Hauptset, bei der Gastmusiker gemeinsam improvisieren.",
  },
  Museum: {
    descriptor: "Ausstellung & Kulturgeschichte",
    detail: "Zugang zu kuratierten Ausstellungen, Meisterwerken und interaktiven Kulturstationen.",
  },
  Nachtveranstaltung: {
    descriptor: "Kultur bis spät in die Nacht",
    detail: "Sonderöffnungszeiten mit besonderem Rahmenprogramm, Illuminationen und Nachtführungen.",
  },
  "Shuttle inklusive": {
    descriptor: "Kostenfreier Transfer vor Ort",
    detail: "Regelmäßige Transferbusse verbinden wichtige Bahnhöfe oder Knotenpunkte direkt mit dem Veranstaltungsort.",
  },
  Shuttle: {
    descriptor: "Kostenfreier Transfer vor Ort",
    detail: "Regelmäßige Transferbusse verbinden wichtige Bahnhöfe oder Knotenpunkte direkt mit dem Veranstaltungsort.",
  },
  "Hip-Hop": {
    descriptor: "Beats, Bars & Basslines",
    detail: "Starke Lines, treibende Beats und packende Live-Shows renommierter Acts der Szene.",
  },
  Film: {
    descriptor: "Kinoerlebnis auf Großleinwand",
    detail: "Ausgewähltes Filmhighlight in bester Bild- und Tonqualität mit abgestimmtem Rahmenprogramm.",
  },
  "Open Air": {
    descriptor: "Veranstaltung unter freiem Himmel",
    detail: "Atmosphärisches Freiluft-Erlebnis mit besonderem Flair und stimmungsvoller Kulisse.",
  },
  Originalfassung: {
    descriptor: "Originalton mit Untertiteln",
    detail: "Vorführung im authentischen Originalton (OmU) für den unverfälschten künstlerischen Eindruck.",
  },
  Techno: {
    descriptor: "Elektronischer Clubsound",
    detail: "Treibende Bässe, reduziertes Licht und ein erstklassiges Soundsystem für lange Clubnächte.",
  },
  "Ab 18": {
    descriptor: "Altersbeschränkung",
    detail: "Einlass ausschließlich für volljährige Personen; bitte amtlichen Lichtbildausweis bereithalten.",
  },
  "Drei Floors": {
    descriptor: "Mehrere Sounds & Bühnen",
    detail: "Mehrere Floors mit unterschiedlichen Klangwelten und DJs für musikalische Vielfalt.",
  },
  Familie: {
    descriptor: "Programm für alle Altersgruppen",
    detail: "Familienfreundliches Angebot mit kinderfreundlichen Aktivitäten und entspannten Arealen.",
  },
  Livemusik: {
    descriptor: "Handgemachte Bühnenshow",
    detail: "Echte Instrumente, starke Stimmen und authentische Bühnenpräsenz von Live-Musiker:innen.",
  },
  Handball: {
    descriptor: "Hallenaction & Dynamik",
    detail: "Schneller, körperbetonter Hallensport mit mitreißender Stimmung und hoher Spieldynamik.",
  },
  Bargeldlos: {
    descriptor: "Cashless Payment vor Ort",
    detail: "Schnelle und kontaktlose Bezahlung an allen Ständen per EC-Karte, Kreditkarte oder Smartphone.",
  },
  Wiesn: {
    descriptor: "Traditionelle Festkultur",
    detail: "Bayerisches Brauchtum mit Festbier, Blasmusik und zünftiger Stimmung im Festzelt.",
  },
  Reservierung: {
    descriptor: "Garantierter Tischplatz",
    detail: "Fester Sitzbereich für deine Gruppe ohne langes Anstehen vor dem Zelt oder Einlass.",
  },
  Gruppe: {
    descriptor: "Gemeinsames Erlebnis",
    detail: "Perfekt abgestimmt für Freundeskreise, Teams oder Kolleg:innen an zusammenhängenden Plätzen.",
  },
  Comedy: {
    descriptor: "Humor & Unterhaltung",
    detail: "Pointenreiche Gags, scharfsinniger Wortwitz und beste Abendunterhaltung.",
  },
  "Stand-up": {
    descriptor: "Solo-Performances am Mikrofon",
    detail: "Direkte und authentische Stand-up-Comedy aus der aktuellen Comedy-Szene.",
  },
  "Mixed Show": {
    descriptor: "Mehrere Künstler an einem Abend",
    detail: "Kuratiertes Line-up mit mehreren Comedians in einer abwechslungsreichen Show.",
  },
  Städtetrip: {
    descriptor: "Kompakte Städtereise",
    detail: "Kultur, Kulinarik und Sehenswürdigkeiten einer faszinierenden Metropole im handlichen Format.",
  },
  Weihnachtsmarkt: {
    descriptor: "Festliche Winterstimmung",
    detail: "Historische Kulisse mit Lichterglanz, traditionellem Kunsthandwerk und winterlichen Düften.",
  },
  Führung: {
    descriptor: "Geführter Rundgang mit Guide",
    detail: "Erfahrene Guides vermitteln fundierte Einblicke und spannende Geschichten hinter den Kulissen.",
  },
  "Glühwein inklusive": {
    descriptor: "Heißgetränk im Ticket enthalten",
    detail: "Ein wärmender Glühwein oder alkoholfreier Punsch ist bereits im Ticketpreis inbegriffen.",
  },
  Silvester: {
    descriptor: "Feierlicher Jahreswechsel",
    detail: "Stilvoller Jahresausklang mit festlichem Rahmen, Musik und Mitternachtszauber.",
  },
  Ball: {
    descriptor: "Eleganter Tanzabend",
    detail: "Klassisches Ballambiente mit Orchesterbegleitung, Tanzparkett und festlicher Garderobe.",
  },
  "Menü inklusive": {
    descriptor: "Mehrgängiges Festmenü",
    detail: "Mehrgängiges Menü aus frischen saisonalen Zutaten, serviert am Platz.",
  },
  Ski: {
    descriptor: "Wintersport am Hang",
    detail: "Spektakuläre Abfahrten auf anspruchsvollen Pisten vor beeindruckender Bergkulisse.",
  },
  Weltcup: {
    descriptor: "Internationale Spitzenklasse",
    detail: "Offizieller Wettkampf der weltbesten Wintersportlerinnen und Wintersportler.",
  },
  Lesung: {
    descriptor: "Literatur & Autorengespräch",
    detail: "Ausgewählte Textpassagen, lebendig vorgetragen mit anschließendem Autorenkontakt.",
  },
  Krimi: {
    descriptor: "Spannung & Rätsel",
    detail: "Nervenkitzel und packende Kriminalfälle in atmosphärischem Ambiente.",
  },
  "Kleines Publikum": {
    descriptor: "Exklusiver, intimer Rahmen",
    detail: "Strikte Teilnehmerbegrenzung für eine persönliche und nahbare Atmosphäre.",
  },
  Wandern: {
    descriptor: "Aktiv in der Natur",
    detail: "Abwechslungsreiche Etappen durch beeindruckende Naturlandschaften und Bergpanoramen.",
  },
  Bergführer: {
    descriptor: "Geprüfte Begleitung am Berg",
    detail: "Geführte Touren mit zertifizierten Bergführer:innen für maximale Sicherheit auf der Route.",
  },
  Pop: {
    descriptor: "Gefühlvolle Melodien & Hymnen",
    detail: "Eingängige Melodien, erstklassige Arrangements und berührende Songtexte.",
  },
  Deutschsprachig: {
    descriptor: "Texte auf Deutsch",
    detail: "Authentische deutschsprachige Texte, die Raum für Emotionen und Tiefe bieten.",
  },
  Streicher: {
    descriptor: "Klassisches Streicherensemble",
    detail: "Feinfühlige Streicherbegleitung verleiht den Songs eine besondere musikalische Dimension.",
  },
  Basketball: {
    descriptor: "Dynamischer Hallensport",
    detail: "Schnelle Spielzüge, Dreier und emotionale Stimmung auf den Hallenrängen.",
  },
  EuroLeague: {
    descriptor: "Europäische Spitzenklasse",
    detail: "Duelle gegen die absoluten Top-Teams des europäischen Basketballs.",
  },
  Taschenlimit: {
    descriptor: "Hinweis zu Taschen & Rucksäcken",
    detail: "Aus Sicherheits- und Einlassgründen sind nur Taschen bis maximal DIN-A4-Größe gestattet.",
  },
}

export function eventHighlightDetailByTag(tag: string): EventHighlightDetail {
  const trimmed = tag.trim()

  if (trimmed.startsWith("Support:")) {
    const actName = trimmed.replace(/^Support:\s*/i, "").trim()
    return {
      tag: trimmed,
      title: trimmed,
      descriptor: "Special Guest & Vorband",
      detail: actName
        ? `Als offizieller Support-Act eröffnet ${actName} den Abend vor dem Hauptprogramm.`
        : "Offizieller Support-Act zur Einstimmung vor dem Hauptauftritt.",
    }
  }

  const daysMatch = trimmed.match(/^(\d+)\s*Tage?$/i)
  if (daysMatch) {
    const count = daysMatch[1]
    return {
      tag: trimmed,
      title: trimmed,
      descriptor: "Mehrtägiges Gesamterlebnis",
      detail: `Das Ticket gewährt Zutritt für die gesamte Veranstaltungsdauer über ${count} Tage.`,
    }
  }

  const mapped = tagDetailMap[trimmed]
  if (mapped) {
    return {
      tag: trimmed,
      title: trimmed,
      descriptor: mapped.descriptor,
      detail: mapped.detail,
    }
  }

  return {
    tag: trimmed,
    title: trimmed,
    descriptor: "Besonderes Highlight",
    detail: `"${trimmed}" ist ein charakteristisches Programmmerkmal und Highlight dieser Veranstaltung.`,
  }
}
