import type { TicketOrder } from "./TicketOrder.ts"

export const ticketOrderMockList: readonly TicketOrder[] = [
  {
    id: "order-fusion-demo",
    code: "EVT-FUS-2026-8841",
    createdAt: "2026-05-02T14:30:00+02:00",
    eventId: "fusion-festival",
    eventTitle: "Fusion Festival — Ferienkommunismus",
    eventStartsAt: "2026-06-24T14:00:00+02:00",
    eventDoorsAt: "2026-06-24T10:00:00+02:00",
    venue: "Flugplatz Lärz",
    city: "Lärz",
    address: "Zum Flugplatz 1, 17248 Lärz",
    imageUrl: "/images/dj-stage_ba046940.webp",
    contact: {
      firstName: "Alex",
      lastName: "Müller",
      email: "alex.mueller@example.com",
      phone: "+49 170 1234567",
    },
    paymentMethod: "wallet",
    lines: [
      {
        tierId: "vollticket",
        tierName: "Vollticket",
        priceCents: 22000,
        feeCents: 990,
        quantity: 2,
      },
    ],
    total: {
      quantity: 2,
      subtotalCents: 44000,
      feeCents: 1980,
      totalCents: 45980,
    },
  },
  {
    id: "order-toskana-demo",
    code: "EVT-TOS-2026-1049",
    createdAt: "2026-04-18T10:15:00+02:00",
    eventId: "reise-toskana-weinwoche",
    eventTitle: "Toskana Weinwoche",
    eventStartsAt: "2026-05-16T10:00:00+02:00",
    eventDoorsAt: "2026-05-16T08:00:00+02:00",
    venue: "Agriturismo Le Vigne",
    city: "Greve in Chianti",
    address: "Via San Cresci 12, 50022 Greve in Chianti, Italien",
    imageUrl: "/images/festival-lights_3f89b9a5.webp",
    contact: {
      firstName: "Alex",
      lastName: "Müller",
      email: "alex.mueller@example.com",
      phone: "+49 170 1234567",
    },
    paymentMethod: "card",
    lines: [
      {
        tierId: "standard",
        tierName: "Standardzimmer pro Person",
        priceCents: 98000,
        feeCents: 3900,
        quantity: 1,
      },
    ],
    total: {
      quantity: 1,
      subtotalCents: 98000,
      feeCents: 3900,
      totalCents: 101900,
    },
  },
]
