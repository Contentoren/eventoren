import type { EventItem } from "./EventItem.ts"

const mockExclusionsById: Record<string, readonly string[]> = {
  "kraftklub-arena-berlin": [
    "An- und Abreise zur Uber Arena Berlin",
    "Speisen und Getränke in den Hallenumläufen",
    "Garderobengebühr vor Ort",
    "Merchandise-Artikel und Tour-Souvenirs",
  ],
  "philharmonie-mahler-5": [
    "An- und Abreise zur Elbphilharmonie Hamburg",
    "Speisen und Getränke in den Pausenfoyers",
    "Garderobengebühr und gedrucktes Programmbuch",
    "Parkhausgebühren am Kaiserkai",
  ],
  "wacken-open-air": [
    "Individuelle An- und Abreise nach Wacken (außer dem kostenlosen Shuttle ab Bahnhof Itzehoe)",
    "Verpflegung, Speisen und Getränke auf dem Festivalgelände",
    "Eigene Camping- und Zeltausrüstung",
    "Stromanschlüsse auf dem Standard-Zeltplatz",
  ],
  "fusion-festival": [
    "An- und Abreise zum Flugplatz Lärz",
    "Eigene Camping- und Kochausrüstung",
    "Verpflegung sowie Speisen und Getränke an den Ständen",
    "Müllpfand (Rückerstattung bei Wertmarken- und Müllabgabe vor Ort)",
  ],
  "schauspielhaus-faust": [
    "An- und Abreise zum Schauspielhaus Bochum",
    "Getränke und Snacks an den Theaterbars",
    "Garderobengebühr",
    "Gedrucktes Programmheft",
  ],
  "bundesliga-bvb-sge": [
    "An- und Abreise außerhalb des VRR-Tarifgebiets",
    "Speisen und Getränke im Signal Iduna Park (bargeldlose Zahlung)",
    "Fanartikel und Stadionmagazin",
    "Parkgebühren an den Westfalenhallen",
  ],
  "berlin-marathon-startplatz": [
    "An- und Abreise nach Berlin sowie Hotelübernachtungen",
    "Persönliche Laufausrüstung und Wettkampfbekleidung",
    "Medaillengravur vor Ort (optional zubuchbar)",
    "Persönliche Verpflegung vor und nach dem Lauf",
  ],
  "reise-nordlichter-tromsoe": [
    "Mittag- und Abendessen sowie persönliche Ausgaben",
    "An- und Abreise zum Flughafen Frankfurt am Main",
    "Persönliche Winter- und Thermokleidung für Freizeitaktivitäten",
    "Reiserücktritts- und Auslandskrankenversicherung",
  ],
  "reise-toskana-weinwoche": [
    "Eigene An- und Abreise in die Toskana (Flug, Bahn oder Mietwagen)",
    "Zusätzliche Mahlzeiten außerhalb der gebuchten Halbpension",
    "Örtliche Kurtaxe (vor Ort im Agriturismo zahlbar)",
    "Persönliche Reise- und Reiserücktrittsversicherung",
  ],
  "jazzclub-nightsession": [
    "Speisen und Getränke am Clubtisch (Abrechnung nach individuellem Verzehr)",
    "An- und Abreise zum Stadtgarten Köln",
    "Garderobengebühr",
    "Parkgebühren im Belgischen Viertel",
  ],
  "museumsnacht-muenchen": [
    "Reguläre Fahrten im MVV-Netz außerhalb der Sonder-Shuttlebusse",
    "Speisen und Getränke in den teilnehmenden Museen",
    "Sonderführungen mit gesonderter Voranmeldung oder Zuzahlung",
    "Garderobengebühren in den einzelnen Häusern",
  ],
  "splash-hiphop-festival": [
    "An- und Abreise nach Gräfenhainichen / Ferropolis",
    "Eigene Zelt- und Campingausrüstung (sofern Standard-Festivalticket gewählt)",
    "Verpflegung, Speisen und Getränke auf dem Festivalgelände",
    "Müllpfand sowie Parkgebühren für PKW",
  ],
  "open-air-kino-hafen": [
    "An- und Abreise zur Zollhafen Nordmole in Mainz",
    "Snacks, Popcorn und Getränke an der Kinobar",
    "Eigene Sitzunterlage oder Picknickdecke (bei gebuchter Wiesenplatz-Kategorie)",
    "Parkgebühren am Hafenareal",
  ],
  "technoclub-warehouse-nacht": [
    "Getränke und Konsumationen an den Clubbars",
    "Garderobengebühr am Einlass",
    "An- und Abreise zum Kraftwerk Mitte Berlin",
    "Foto- und Videoaufnahmen (striktes Handy-Fotoverbot im Club)",
  ],
  "streetfood-markt-sonntag": [
    "Speisen und Getränke an den Ständen (auf Selbstzahlerbasis)",
    "An- und Abreise zu den Rheinwiesen Oberkassel",
    "Parkgebühren im Umfeld des Geländes",
    "Kostenpflichtige Mitmachworkshops vor Ort",
  ],
  "handball-thw-kiel-rn-loewen": [
    "An- und Abreise zur Wunderino Arena Kiel",
    "Speisen und Getränke im Arena-Umlauf (bargeldlose Bezahlung)",
    "Fanartikel im offiziellen THW-Fanshop",
    "Parkplatzgebühren am Europaplatz",
  ],
  "oktoberfest-zeltreservierung": [
    "Zusätzliche Speisen und Getränke über die enthaltenen 10 Maß und 10 Hendl hinaus",
    "Freiwilliges Trinkgeld und Bedienungsgeld",
    "An- und Abreise zur Theresienwiese München",
    "Fahrgeschäfte und Vergnügungsangebote auf der Festwiese",
  ],
  "comedy-mixed-show": [
    "Getränke und Snacks an den Foyerbars",
    "Garderobengebühr im Kesselhaus",
    "An- und Abreise zur Kulturbrauerei Berlin",
    "Parkhausgebühren auf dem Kulturbrauerei-Gelände",
  ],
  "reise-lissabon-staedtetrip": [
    "Mittag- und Abendessen (außerhalb des inkludierten Fado-Abends)",
    "An- und Abreise zum Flughafen Berlin Brandenburg (BER)",
    "Eintrittsgelder für Sehenswürdigkeiten in Sintra (z. B. Palácio Nacional da Pena)",
    "Örtliche Touristensteuer (vor Ort im Hotel zu entrichten)",
    "Reiserücktritts- und Auslandskrankenversicherung",
  ],
  "weihnachtsmarkt-nuernberg-fuehrung": [
    "Zusätzliche Speisen, Heißgetränke und Markteinkäufe",
    "An- und Abreise zum Nürnberger Hauptmarkt",
    "Tassenpfand für den Glühweinbecher (wird bei Becher-Rückgabe erstattet)",
    "Parkgebühren in den Altstadt-Parkhäusern",
  ],
  "silvester-tanz-in-den-jahreswechsel": [
    "Zusätzliche Getränke zum Menü und an den Bars (außer Mitternachtssekt)",
    "Übernachtung und persönliche An-/Abreise nach Wiesbaden",
    "Garderobengebühr im Kurhaus",
    "Parkgebühren am Kurhaus Wiesbaden",
  ],
  "ski-alpin-weltcup-garmisch": [
    "An- und Abreise nach Garmisch-Partenkirchen (außer dem kostenlosen Shuttle ab Bahnhof)",
    "Reguläre Skipässe für das Skigebiet Garmisch-Classic / Zugspitze",
    "Verpflegung, Speisen und Heißgetränke an den Zuschauerständen",
    "Persönliche Wintersportausrüstung",
  ],
  "rock-am-ring-2027": [
    "An- und Abreise zum Nürburgring sowie Parkticket für PKW",
    "Eigene Zelt-, Schlaf- und Campingausstattung",
    "Verpflegung, Speisen und Getränke auf dem Festivalgelände",
    "Müllpfand (Rückerstattung bei Wertmarken- und Müllabgabe vor Ort)",
    "Stromanschlüsse auf den Zeltplätzen",
  ],
  "tatort-lesung-hafenkrimi": [
    "An- und Abreise zum Museumshafen Oevelgönne (z. B. HADAG-Fähre)",
    "Getränke und Snacks an Bord",
    "Parkplatzgebühren am Elbufer",
    "Signierte Buchexemplare des Autors",
  ],
  "reise-wandern-suedtirol": [
    "An- und Abreise zum Treffpunkt am Bahnhof Bozen",
    "Persönliche Wanderausrüstung und feste Bergschuhe",
    "Mittagsverpflegung, Tourenproviant und persönliche Getränke auf den Hütten",
    "Etwaige Bergbahnfahrten außerhalb der geplanten Wanderroute",
    "Reiserücktritts- und Bergrettungsversicherung",
  ],
  "arena-tour-annenmaykantereit": [
    "An- und Abreise zur Lanxess Arena Köln",
    "Speisen und Getränke an den Hallenkiosken",
    "Garderobengebühr vor Ort",
    "Merchandise-Artikel der Band",
  ],
  "basketball-euroleague-bayern": [
    "An- und Abreise zum SAP Garden München",
    "Speisen und Getränke an den Hallenkiosken (bei Tickets ohne VIP-Catering)",
    "Garderobe und Schließfachgebühren bei Überschreitung des DIN-A4-Taschenformats",
    "Parkgebühren im Olympiapark",
  ],
}

function eventExclusionsFallback(event: EventItem): readonly string[] {
  const categorySpecific: Record<EventItem["category"], readonly string[]> = {
    konzerte: [
      `An- und Abreise zur Spielstätte ${event.venue}`,
      "Speisen und Getränke vor Ort in der Spielstätte",
      "Garderobengebühren und Merchandise-Artikel",
    ],
    festivals: [
      `An- und Abreise zum Festivalgelände ${event.venue}`,
      "Eigene Camping- und Zeltausrüstung (sofern nicht gesondert gebucht)",
      "Verpflegung, Speisen, Getränke und Müllpfand vor Ort",
    ],
    sport: [
      `An- und Abreise zur Sportstätte ${event.venue} (außer bei ausgewiesenen Kombitickets)`,
      "Speisen und Getränke im Stadion oder in der Arena",
      "Fanartikel und Parkplatzgebühren",
    ],
    kultur: [
      `An- und Abreise zum Veranstaltungsort ${event.venue}`,
      "Gastronomische Angebote, Getränke und Snacks vor Ort",
      "Garderobengebühren und gedruckte Programmbegleiter",
    ],
    reisen: [
      "Anreise zum Start- oder Abflugort",
      "Mahlzeiten und Getränke außerhalb der gebuchten Verpflegung",
      "Persönliche Reiseversicherungen und örtliche Abgaben",
    ],
  }

  return (
    categorySpecific[event.category] ?? [
      `An- und Abreise zum Veranstaltungsort ${event.venue}`,
      "Speisen und Getränke vor Ort",
      "Persönliche Ausgaben und optionale Zusatzleistungen",
    ]
  )
}

export function eventExclusionsGet(event: EventItem): readonly string[] {
  const exact = mockExclusionsById[event.id]
  if (exact && exact.length > 0) {
    return exact
  }

  return eventExclusionsFallback(event)
}
