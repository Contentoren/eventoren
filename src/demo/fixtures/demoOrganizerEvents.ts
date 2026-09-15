import type { OrganizerEvent } from "../../organizer/OrganizerEvent.ts"

export const demoOrganizerEvents: readonly OrganizerEvent[] = [
  {
    id: "demo-event-xyz",
    eventKey: "xyz",
    title: "Kraftklub — Karges Land Tour",
    imageUrl: "/images/concert-crowd_460af152.webp",
    imageAlt: "Beleuchtete Konzertbühne und feierndes Publikum",
    startsAt: "2027-04-16T21:00:00+02:00",
    endsAt: "2027-04-16T23:00:00+02:00",
    doorsAt: "2027-04-16T18:30:00+02:00",
    status: "published",
  },
  {
    id: "demo-event-museum",
    eventKey: "museum-night",
    title: "Lange Nacht der Münchner Museen",
    imageUrl: "/images/festival-lights_3f89b9a5.webp",
    imageAlt: "Lichtinstallation vor einer nächtlichen Veranstaltungsbühne",
    startsAt: "2027-10-16T19:00:00+02:00",
    endsAt: "2027-10-17T02:00:00+02:00",
    doorsAt: "2027-10-16T18:30:00+02:00",
    status: "published",
  },
]
