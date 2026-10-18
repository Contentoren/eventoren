import { imageList } from "../../../app/assets/imageList.js"
import { urlImage } from "../../../app/assets/urlImage.js"
import type { DashEvent } from "../../model/dashEventSchema.ts"

import { dashSeedTimeAt } from "./dashSeedTimeAt.ts"

function minusMinutes(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) - minutes * 60_000).toISOString()
}

function indieDoorsAt(now: Date): string {
  const floored = Math.floor(now.getTime() / 900_000) * 900_000 - 60 * 60_000
  return new Date(floored).toISOString()
}

type EventDraft = Omit<DashEvent, "doorsAt" | "boxOffice" | "reminder" | "createdAt" | "updatedAt" | "publishedAt">

function withMeta(
  draft: EventDraft,
  input: {
    startsAt: string
    doorsAt: string | null
    createdAt: string
    published: boolean
    boxOfficeOpensAt: string | null
    reminderSentAt: string | null
  },
): DashEvent {
  return {
    ...draft,
    doorsAt: input.doorsAt,
    boxOffice: { enabled: input.boxOfficeOpensAt !== null, opensAt: input.boxOfficeOpensAt },
    reminder: {
      enabled: true,
      hoursBefore: 24,
      directions: "Ab Leipzig Hbf mit der Tram 9 bis Lindenhofstraße, dann 3 Min. zu Fuß.",
      calendar: `${draft.title} · ${draft.venue.name}, ${draft.venue.city}`,
      sentAt: input.reminderSentAt,
    },
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    publishedAt: input.published ? input.createdAt : null,
  }
}

export function dashSeedEvents(now: Date): DashEvent[] {
  const created = dashSeedTimeAt(now, -60, "10:00")

  const sommerStarts = dashSeedTimeAt(now, -12, "19:30")
  const sommernacht: EventDraft = {
    id: "ev-sommernacht",
    orgId: "org-lindenhof",
    slug: "sommernachtskonzert",
    title: "Sommernachtskonzert im Hof",
    subtitle: "Open Air mit Streichern und Band",
    category: "konzert",
    startsAt: sommerStarts,
    endsAt: dashSeedTimeAt(now, -12, "23:00"),
    venue: { name: "Kulturhaus Lindenhof – Innenhof", street: "Lindenhofstraße 12", zip: "04109", city: "Leipzig" },
    imageUrl: urlImage(imageList.i1920x1080_webp_concert_crowd),
    imageAlt: "Streicherensemble auf der Hofbühne vor begeistertem Publikum bei Sonnenuntergang",
    description:
      "Ein lauer Augustabend, **Streicher und Band** auf einer Bühne: Das Sommernachtskonzert hat den Hof in ein Open-Air-Wohnzimmer verwandelt. Auf dem Programm standen Filmmusik, Pop-Arrangements und eine Zugabe bei Kerzenlicht.\n\n- Streicherensemble plus vierköpfige Band\n- Freie Platzwahl auf Decken und Bänken\n- Getränke vom Hoft resen",
    faq: [
      {
        id: "faq-sommer-1",
        question: "Fand das Konzert bei Regen statt?",
        answer: "Ja, bei leichtem Regen wurde unter den Schirmen gespielt.",
      },
      { id: "faq-sommer-2", question: "Gab es Sitzplätze?", answer: "Es gab Bänke und freie Deckenplätze im Hof." },
      {
        id: "faq-sommer-3",
        question: "Durften Kinder mit?",
        answer: "Ja, Kinder bis 12 Jahre hatten freien Eintritt.",
      },
    ],
    schedule: [
      { id: "sch-sommer-1", time: "18:30", title: "Einlass", detail: "Hoftore öffnen, Getränkestände haben geöffnet" },
      {
        id: "sch-sommer-2",
        time: "19:30",
        title: "Konzertbeginn",
        detail: "Erster Satz: Filmmusik unterm Sternenhimmel",
      },
      { id: "sch-sommer-3", time: "21:15", title: "Pause", detail: "20 Minuten, Lichterketten an" },
      {
        id: "sch-sommer-4",
        time: "21:35",
        title: "Zweiter Teil",
        detail: "Pop-Arrangements und Zugabe bei Kerzenlicht",
      },
    ],
    status: "veroeffentlicht",
    visibility: "oeffentlich",
    salesPaused: false,
    cancelReason: "",
  }

  const indieDoors = indieDoorsAt(now)
  const indieStarts = new Date(Date.parse(indieDoors) + 90 * 60_000).toISOString()
  const indieNight: EventDraft = {
    id: "ev-indie-night",
    orgId: "org-lindenhof",
    slug: "indie-night-lichtspiel",
    title: "Indie Night: Lichtspiel",
    subtitle: "Drei Bands, eine Bühne, null Sitze",
    category: "konzert",
    startsAt: indieStarts,
    endsAt: new Date(Date.parse(indieStarts) + 4 * 3_600_000).toISOString(),
    venue: { name: "Kulturhaus Lindenhof – Saal", street: "Lindenhofstraße 12", zip: "04109", city: "Leipzig" },
    imageUrl: urlImage(imageList.i1920x1080_webp_dj_stage),
    imageAlt: "Indie-Band auf dunkler Bühne im Scheinwerferlicht vor tanzendem Publikum",
    description:
      "Die **Indie Night** bringt drei Gitarrenbands auf die Saalbühne – laut, ehrlich und zum Tanzen. Mit Lichtshow von *Lichtspiel Kollektiv* und Aftershow-DJ bis Mitternacht.\n\n- Drei Live-Bands plus Aftershow-DJ\n- Lichtshow vom Lichtspiel Kollektiv\n- Abendkasse vor Ort, solange der Vorrat reicht",
    faq: [
      {
        id: "faq-indie-1",
        question: "Gibt es eine Abendkasse?",
        answer: "Ja, solange Tickets verfügbar sind – 28 € pro Person.",
      },
      {
        id: "faq-indie-2",
        question: "Ab wann ist Einlass?",
        answer: "Der Einlass beginnt 90 Minuten vor Konzertbeginn.",
      },
      {
        id: "faq-indie-3",
        question: "Gibt es Sitzplätze?",
        answer: "Nein, die Indie Night ist ein reines Stehplatzkonzert.",
      },
      {
        id: "faq-indie-4",
        question: "Darf ich mit Rucksack rein?",
        answer: "Große Taschen gibst du bitte an der Garderobe ab.",
      },
    ],
    schedule: [
      { id: "sch-indie-1", time: "19:00", title: "Einlass", detail: "Türen auf, DJ zum Ankommen" },
      { id: "sch-indie-2", time: "20:30", title: "Support: Kiosque", detail: "Dream-Pop aus Leipzig" },
      { id: "sch-indie-3", time: "21:30", title: "Hauptact: Lichtspiel", detail: "Indie-Rock, 75 Minuten" },
      { id: "sch-indie-4", time: "23:00", title: "Aftershow-DJ", detail: "Britpop und Indietronics bis Mitternacht" },
    ],
    status: "veroeffentlicht",
    visibility: "oeffentlich",
    salesPaused: false,
    cancelReason: "",
  }

  const jazzStarts = dashSeedTimeAt(now, 21, "20:00")
  const jazzWein: EventDraft = {
    id: "ev-jazz-wein",
    orgId: "org-lindenhof",
    slug: "jazz-und-wein",
    title: "Jazz & Wein",
    subtitle: "Spätsommer-Jazz mit Weinen der Region",
    category: "konzert",
    startsAt: jazzStarts,
    endsAt: dashSeedTimeAt(now, 21, "23:00"),
    venue: { name: "Kulturhaus Lindenhof – Gartensaal", street: "Lindenhofstraße 12", zip: "04109", city: "Leipzig" },
    imageUrl: urlImage(imageList.i1920x1080_webp_festival_lights),
    imageAlt: "Jazztrio im warmen Licht des Gartensaals, davor gedeckte Weintische",
    description:
      "Beim **Jazz & Wein** trifft ein Klaviertrio auf ausgesuchte Weine sächsischer Weingüter. Sommelière Uta Berger moderiert die Verkostung zwischen den Sets.\n\n- Klaviertrio plus Gastsängerin\n- Drei Verkostungsweine inklusive\n- Bestuhlung an kleinen Tischen",
    faq: [
      {
        id: "faq-jazz-1",
        question: "Ist Wein im Preis enthalten?",
        answer: "Ja, drei Verkostungsweine (je 0,1 l) sind inklusive.",
      },
      {
        id: "faq-jazz-2",
        question: "Gibt es alkoholfreie Alternativen?",
        answer: "Ja, Traubensaft und Wasser stehen bereit.",
      },
      {
        id: "faq-jazz-3",
        question: "Sind die Plätze nummeriert?",
        answer: "Kategorie A vorne, Kategorie B hinten – freie Wahl innerhalb der Kategorie.",
      },
    ],
    schedule: [
      { id: "sch-jazz-1", time: "19:00", title: "Einlass", detail: "Aperitif und Platzwahl" },
      { id: "sch-jazz-2", time: "20:00", title: "Erstes Set", detail: "Trio plus Verkostung Wein eins und zwei" },
      { id: "sch-jazz-3", time: "21:15", title: "Pause", detail: "Wein drei und Gespräche mit der Sommelière" },
      { id: "sch-jazz-4", time: "21:45", title: "Zweites Set", detail: "Mit Gastsängerin, danach Ausklang an der Bar" },
    ],
    status: "veroeffentlicht",
    visibility: "oeffentlich",
    salesPaused: false,
    cancelReason: "",
  }

  const ballStarts = dashSeedTimeAt(now, 70, "19:00")
  const winterball: EventDraft = {
    id: "ev-winterball",
    orgId: "org-lindenhof",
    slug: "winterball",
    title: "Winterball im Lindenhof",
    subtitle: "Der festliche Jahresausklang",
    category: "party",
    startsAt: ballStarts,
    endsAt: dashSeedTimeAt(now, 71, "01:00"),
    venue: { name: "Kulturhaus Lindenhof – Festsaal", street: "Lindenhofstraße 12", zip: "04109", city: "Leipzig" },
    imageUrl: urlImage(imageList.i1920x1080_webp_event_production),
    imageAlt: "Festlich geschmückter Ballsaal mit Kronleuchtern und Tanzpaaren",
    description:
      "Der **Winterball** ist unser festlichster Abend des Jahres: Bigband, Tanzfläche, Mitternachtswalzer und ein winterliches Buffet. Dresscode: festlich.\n\n- Bigband und Tanzfläche die ganze Nacht\n- Winterliches Buffet inklusive\n- Mitternachtswalzer um 0 Uhr",
    faq: [
      {
        id: "faq-ball-1",
        question: "Gibt es einen Dresscode?",
        answer: "Ja: festlich. Abendkleid oder Anzug sind willkommen.",
      },
      {
        id: "faq-ball-2",
        question: "Ist Essen im Preis enthalten?",
        answer: "Das winterliche Buffet ab 20 Uhr ist inklusive.",
      },
      {
        id: "faq-ball-3",
        question: "Gibt es ermäßigte Karten?",
        answer: "Ja, für Schüler:innen, Studierende und Mitglieder des Fördervereins.",
      },
      {
        id: "faq-ball-4",
        question: "Kann ich Karten zurückgeben?",
        answer: "Bis 14 Tage vorher erstatten wir den vollen Preis.",
      },
    ],
    schedule: [
      { id: "sch-ball-1", time: "18:00", title: "Einlass", detail: "Sektempfang im Foyer" },
      { id: "sch-ball-2", time: "19:00", title: "Eröffnung", detail: "Begrüßung und Eröffnungswalzer" },
      { id: "sch-ball-3", time: "20:00", title: "Buffet", detail: "Winterliches Buffet im Gartensaal" },
      { id: "sch-ball-4", time: "22:00", title: "Bigband-Set", detail: "Tanzmusik bis Mitternacht" },
      { id: "sch-ball-5", time: "00:00", title: "Mitternachtswalzer", detail: "Gemeinsamer Walzer, danach Ausklang" },
    ],
    status: "veroeffentlicht",
    visibility: "oeffentlich",
    salesPaused: false,
    cancelReason: "",
  }

  const lesungStarts = dashSeedTimeAt(now, 10, "19:30")
  const lesung: EventDraft = {
    id: "ev-lesung",
    orgId: "org-lindenhof",
    slug: "lesung-stadt-der-stimmen",
    title: "Lesung: Stadt der Stimmen",
    subtitle: "Drei Autorinnen lesen aus ihren Romanen",
    category: "kultur",
    startsAt: lesungStarts,
    endsAt: dashSeedTimeAt(now, 10, "21:30"),
    venue: { name: "Kulturhaus Lindenhof – Gartensaal", street: "Lindenhofstraße 12", zip: "04109", city: "Leipzig" },
    imageUrl: urlImage(imageList.i1920x1080_webp_stage_beams),
    imageAlt: "",
    description: "",
    faq: [],
    schedule: [],
    status: "entwurf",
    visibility: "oeffentlich",
    salesPaused: false,
    cancelReason: "",
  }

  const abiStarts = dashSeedTimeAt(now, 150, "19:00")
  const abiball: EventDraft = {
    id: "ev-abiball-2027",
    orgId: "org-abikur",
    slug: "abiball-2027",
    title: "Abiball 2027",
    subtitle: "Der große Abend des Jahrgangs",
    category: "abiball",
    startsAt: abiStarts,
    endsAt: dashSeedTimeAt(now, 151, "02:00"),
    venue: { name: "Werk 2 – Halle A", street: "Kochstraße 132", zip: "04277", city: "Leipzig" },
    imageUrl: urlImage(imageList.i1920x1080_webp_festival_lights),
    imageAlt: "Abiball-Saal mit Lichterketten, Bühne und festlich gedeckten Tischen",
    description:
      "Der **Abiball 2027** des Immanuel-Kant-Gymnasiums: Zeugnisvergabe, festliches Essen, Ballroom-Tanz und Party bis in die Nacht. Alle Erlöse fließen in die **Abikasse**.\n\n- Festakt mit Zeugnisvergabe\n- Buffet und Mitternachtssnack inklusive\n- After-Show-Party mit DJ",
    faq: [
      {
        id: "faq-abi-1",
        question: "Wer bekommt Schüler:innen-Tickets?",
        answer: "Nur Abiturient:innen des Jahrgangs – per Zugangscode je Klasse.",
      },
      {
        id: "faq-abi-2",
        question: "Dürfen Eltern mit?",
        answer: "Ja, über die Gästetickets – pro Familie nach Verfügbarkeit.",
      },
      { id: "faq-abi-3", question: "Gibt es einen Dresscode?", answer: "Festlich: Anzug oder Abendkleid." },
      { id: "faq-abi-4", question: "Wohin fließt der Erlös?", answer: "Zu 100 % in die Abikasse des Jahrgangs 2027." },
    ],
    schedule: [
      { id: "sch-abi-1", time: "18:00", title: "Einlass", detail: "Sektempfang und Platzwahl" },
      { id: "sch-abi-2", time: "19:00", title: "Festakt", detail: "Reden und Zeugnisvergabe" },
      { id: "sch-abi-3", time: "20:30", title: "Buffet", detail: "Festliches Buffet und Mitternachtssnack" },
      { id: "sch-abi-4", time: "22:00", title: "Ball", detail: "Tanz mit Liveband" },
      { id: "sch-abi-5", time: "00:30", title: "After-Show-Party", detail: "DJ bis 2 Uhr" },
    ],
    status: "veroeffentlicht",
    visibility: "oeffentlich",
    salesPaused: false,
    cancelReason: "",
  }

  const pilatesStarts = dashSeedTimeAt(now, 5, "18:00")
  const pilates: EventDraft = {
    id: "ev-pilates-probe",
    orgId: "org-studio-balance",
    slug: "pilates-probestunde",
    title: "Pilates-Probestunde",
    subtitle: "Schnuppern in kleiner Gruppe",
    category: "kurs",
    startsAt: pilatesStarts,
    endsAt: dashSeedTimeAt(now, 5, "19:00"),
    venue: { name: "Studio Balance", street: "Merseburger Straße 88", zip: "04177", city: "Leipzig" },
    imageUrl: urlImage(imageList.pilates_detail),
    imageAlt: "Heller Pilates-Kursraum mit Matten und Reformer-Geräten",
    description:
      "Die **Pilates-Probestunde** ist der perfekte Einstieg: 60 Minuten Mattentraining in kleiner Gruppe mit zertifizierter Trainerin. Matten und Zubehör stellen wir.\n\n- Maximal 12 Teilnehmer:innen\n- Keine Vorkenntnisse nötig\n- Inklusive Beratungsgespräch",
    faq: [
      {
        id: "faq-pil-1",
        question: "Brauche ich Vorkenntnisse?",
        answer: "Nein, die Probestunde richtet sich an Einsteiger:innen.",
      },
      { id: "faq-pil-2", question: "Was muss ich mitbringen?", answer: "Bequeme Kleidung genügt, Matten stellen wir." },
      {
        id: "faq-pil-3",
        question: "Kann ich danach einen Kurs buchen?",
        answer: "Ja, nach der Stunde beraten wir dich zu passenden Kursen.",
      },
    ],
    schedule: [
      { id: "sch-pil-1", time: "17:45", title: "Ankommen", detail: "Umkleiden und Mattenwahl" },
      { id: "sch-pil-2", time: "18:00", title: "Warm-up", detail: "Mobilisation und Atmung" },
      { id: "sch-pil-3", time: "18:20", title: "Hauptteil", detail: "Klassische Mattenübungen" },
      { id: "sch-pil-4", time: "18:50", title: "Cool-down", detail: "Dehnen und Beratung" },
    ],
    status: "entwurf",
    visibility: "oeffentlich",
    salesPaused: false,
    cancelReason: "",
  }

  const poetryStarts = dashSeedTimeAt(now, -5, "20:00")
  const poetry: EventDraft = {
    id: "ev-poetry-slam",
    orgId: "org-lindenhof",
    slug: "poetry-slam-herbstworte",
    title: "Poetry Slam: Herbstworte",
    subtitle: "Acht Poet:innen, ein Mikrofon",
    category: "kultur",
    startsAt: poetryStarts,
    endsAt: dashSeedTimeAt(now, -5, "22:30"),
    venue: { name: "Kulturhaus Lindenhof – Saal", street: "Lindenhofstraße 12", zip: "04109", city: "Leipzig" },
    imageUrl: urlImage(imageList.i1920x1080_webp_stage_beams),
    imageAlt: "Slam-Poetin am Mikrofon im Spotlicht vor aufmerksamem Publikum",
    description:
      "Beim **Poetry Slam Herbstworte** traten acht Poet:innen gegeneinander an – das Publikum kürte per Applaus die Siegerin des Abends.\n\n- Acht Slammer:innen aus ganz Deutschland\n- Publikumsjury per Applausometer\n- Aftershow mit DJane Plattensalat",
    faq: [
      { id: "faq-poe-1", question: "Wie wurde abgestimmt?", answer: "Per Applausometer – das Publikum entschied." },
      { id: "faq-poe-2", question: "Gab es eine Altersgrenze?", answer: "Empfohlen ab 14 Jahren." },
    ],
    schedule: [
      { id: "sch-poe-1", time: "19:30", title: "Einlass", detail: "Platzwahl und Getränke" },
      { id: "sch-poe-2", time: "20:00", title: "Vorrunde", detail: "Acht Poet:innen, je 5 Minuten" },
      { id: "sch-poe-3", time: "21:15", title: "Finale", detail: "Die besten vier im Stechen" },
      { id: "sch-poe-4", time: "22:00", title: "Siegerehrung", detail: "Plus Aftershow mit DJane" },
    ],
    status: "veroeffentlicht",
    visibility: "oeffentlich",
    salesPaused: false,
    cancelReason: "",
  }

  const warmupStarts = dashSeedTimeAt(now, -25, "22:00")
  const warmup: EventDraft = {
    id: "ev-abi-warmup",
    orgId: "org-abikur",
    slug: "abi-warm-up-party",
    title: "Abi Warm-up Party",
    subtitle: "Die erste Party des Abijahrs",
    category: "party",
    startsAt: warmupStarts,
    endsAt: dashSeedTimeAt(now, -24, "04:00"),
    venue: { name: "Ilses Erika", street: "Bernhard-Göring-Straße 152", zip: "04277", city: "Leipzig" },
    imageUrl: urlImage(imageList.i1920x1080_webp_dj_stage),
    imageAlt: "Volle Tanzfläche mit Konfetti und DJ-Pult bei der Abi-Party",
    description:
      "Die **Abi Warm-up Party** war der Startschuss ins Abijahr: zwei Floors, Schüler-DJs und alle Einnahmen für die **Abikasse**.\n\n- Zwei Floors: Charts und Techno\n- Schüler-DJs plus Überraschungsact\n- Erlös für den Abiball",
    faq: [
      { id: "faq-wu-1", question: "Wer durfte rein?", answer: "Schüler:innen ab 16 Jahren mit Schülerausweis." },
      { id: "faq-wu-2", question: "Gab es Abendkasse?", answer: "Ja, solange die Kapazität reichte." },
    ],
    schedule: [
      { id: "sch-wu-1", time: "21:00", title: "Einlass", detail: "Bändchen und Stempel" },
      { id: "sch-wu-2", time: "22:00", title: "Floor eins", detail: "Charts und Partyhits" },
      { id: "sch-wu-3", time: "23:00", title: "Floor zwei", detail: "Techno mit Gast-DJ" },
      { id: "sch-wu-4", time: "02:00", title: "Finale", detail: "Alle Floors vereint bis 4 Uhr" },
    ],
    status: "veroeffentlicht",
    visibility: "oeffentlich",
    salesPaused: false,
    cancelReason: "",
  }

  return [
    withMeta(sommernacht, {
      startsAt: sommerStarts,
      doorsAt: minusMinutes(sommerStarts, 60),
      createdAt: created,
      published: true,
      boxOfficeOpensAt: null,
      reminderSentAt: dashSeedTimeAt(now, -13, "20:00"),
    }),
    withMeta(indieNight, {
      startsAt: indieStarts,
      doorsAt: indieDoors,
      createdAt: created,
      published: true,
      boxOfficeOpensAt: indieDoors,
      reminderSentAt: dashSeedTimeAt(now, -1, "20:00"),
    }),
    withMeta(jazzWein, {
      startsAt: jazzStarts,
      doorsAt: minusMinutes(jazzStarts, 60),
      createdAt: created,
      published: true,
      boxOfficeOpensAt: null,
      reminderSentAt: null,
    }),
    withMeta(winterball, {
      startsAt: ballStarts,
      doorsAt: minusMinutes(ballStarts, 60),
      createdAt: created,
      published: true,
      boxOfficeOpensAt: null,
      reminderSentAt: null,
    }),
    withMeta(lesung, {
      startsAt: lesungStarts,
      doorsAt: minusMinutes(lesungStarts, 30),
      createdAt: dashSeedTimeAt(now, -5, "10:00"),
      published: false,
      boxOfficeOpensAt: null,
      reminderSentAt: null,
    }),
    withMeta(abiball, {
      startsAt: abiStarts,
      doorsAt: minusMinutes(abiStarts, 60),
      createdAt: created,
      published: true,
      boxOfficeOpensAt: null,
      reminderSentAt: null,
    }),
    withMeta(pilates, {
      startsAt: pilatesStarts,
      doorsAt: minusMinutes(pilatesStarts, 15),
      createdAt: dashSeedTimeAt(now, -10, "10:00"),
      published: false,
      boxOfficeOpensAt: null,
      reminderSentAt: null,
    }),
    withMeta(poetry, {
      startsAt: poetryStarts,
      doorsAt: minusMinutes(poetryStarts, 30),
      createdAt: created,
      published: true,
      boxOfficeOpensAt: null,
      reminderSentAt: dashSeedTimeAt(now, -6, "20:00"),
    }),
    withMeta(warmup, {
      startsAt: warmupStarts,
      doorsAt: minusMinutes(warmupStarts, 60),
      createdAt: created,
      published: true,
      boxOfficeOpensAt: null,
      reminderSentAt: dashSeedTimeAt(now, -26, "20:00"),
    }),
  ]
}
