import { imageList } from "../../../app/assets/imageList.js"
import { urlImage } from "../../../app/assets/urlImage.js"
import type { DashTemplate } from "../../model/dashTemplateSchema.ts"

import { dashSeedTimeAt } from "./dashSeedTimeAt.ts"

export function dashSeedTemplates(now: Date): DashTemplate[] {
  return [
    {
      id: "tpl-konzert-im-hof",
      orgId: "org-lindenhof",
      name: "Konzert im Hof",
      createdAt: dashSeedTimeAt(now, -50, "10:00"),
      sourceEventId: "ev-sommernacht",
      durationMinutes: 180,
      doorsBeforeMinutes: 60,
      event: {
        title: "Konzert im Hof",
        subtitle: "Open Air im Innenhof",
        category: "konzert",
        venue: {
          name: "Kulturhaus Lindenhof – Innenhof",
          street: "Lindenhofstraße 12",
          zip: "04109",
          city: "Leipzig",
        },
        description:
          "Vorlage für **Hofkonzerte**: Bühne, Bestuhlung und Getränkestände sind eingespielt.\n\n- Einlass 60 Minuten vor Beginn\n- Freie Platzwahl auf Bänken und Decken",
        faq: [
          {
            id: "tpl-faq-regen",
            question: "Findet das Konzert bei Regen statt?",
            answer: "Ja, bei leichtem Regen spielen wir weiter.",
          },
        ],
        schedule: [
          { id: "tpl-sch-einlass", time: "18:30", title: "Einlass", detail: "Hoftore öffnen" },
          { id: "tpl-sch-beginn", time: "19:30", title: "Konzertbeginn", detail: "Erster Teil" },
        ],
        imageUrl: urlImage(imageList.i1920x1080_webp_concert_crowd),
        imageAlt: "Bühne im Lindenhof-Hof vor Publikum in der Abendsonne",
        reminder: {
          enabled: true,
          hoursBefore: 24,
          directions: "Ab Leipzig Hbf mit der Tram 9 bis Lindenhofstraße, dann 3 Min. zu Fuß.",
          calendar: "Konzert im Hof · Kulturhaus Lindenhof, Leipzig",
          sentAt: null,
        },
      },
      ticketTypes: [
        {
          name: "Standard",
          description: "Freie Platzwahl im Hof.",
          channel: "online",
          hidden: false,
          capacity: 350,
          maxPerOrder: 10,
          taxRateBps: 700,
          sortOrder: 0,
          salesStartOffsetMinutes: -43_200,
          salesEndOffsetMinutes: null,
          phases: [
            { name: "Early Bird", priceCents: 1900, endsOffsetMinutes: -20_160, quota: 100 },
            { name: "Regulär", priceCents: 2400, endsOffsetMinutes: null, quota: null },
          ],
        },
        {
          name: "Ermäßigt",
          description: "Für Schüler:innen, Studierende und Mitglieder.",
          channel: "online",
          hidden: false,
          capacity: 100,
          maxPerOrder: 10,
          taxRateBps: 700,
          sortOrder: 1,
          salesStartOffsetMinutes: -43_200,
          salesEndOffsetMinutes: null,
          phases: [{ name: "Regulär", priceCents: 1600, endsOffsetMinutes: null, quota: null }],
        },
      ],
    },
  ]
}
