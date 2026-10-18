import type { DashEvent } from "./dashEventSchema.ts"
import type { DashOrder } from "./dashOrderSchema.ts"
import type { DashOrderChannel } from "./dashOrderChannelSchema.ts"
import type { DashOrderStatus } from "./dashOrderStatusSchema.ts"
import type { DashState } from "./dashStateSchema.ts"
import type { DashTicket } from "./dashTicketSchema.ts"

export function dashStatsOrgCreate(): DashState["orgs"][number] {
  return {
    id: "org-lindenhof",
    slug: "kulturhaus-lindenhof",
    name: "Kulturhaus Lindenhof e.V.",
    kind: "verein",
    subtitle: "",
    description: "",
    logoDataUrl: null,
    website: "",
    email: "",
    phone: "",
    socials: { instagram: "", facebook: "", tiktok: "", youtube: "", x: "", linkedin: "" },
    imprint: { legalName: "", street: "", zip: "", city: "", representative: "", register: "", vatId: "" },
    bank: { holder: "", iban: "" },
    tax: { status: "regel", defaultRateBps: 700 },
    fee: { percentBps: 500, fixedCents: 49, payer: "kaeufer" },
    status: "aktiv",
    statusReason: "",
    termsAcceptedAt: null,
    dpaAcceptedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    voucherDefaultValidity: "3-jahre-jahresende",
  }
}

export function dashStatsEventCreate(overrides: Partial<DashEvent> & { id: string }): DashEvent {
  return {
    orgId: "org-lindenhof",
    slug: `event-${overrides.id}`,
    title: `Event ${overrides.id}`,
    subtitle: "",
    category: "konzert",
    startsAt: "2026-12-08T19:00:00.000Z",
    endsAt: "2026-12-08T23:00:00.000Z",
    doorsAt: "2026-12-08T18:00:00.000Z",
    venue: { name: "Lindenhof", street: "", zip: "", city: "" },
    imageUrl: "",
    imageAlt: "Bühne",
    description: "",
    faq: [],
    schedule: [],
    status: "veroeffentlicht",
    visibility: "oeffentlich",
    salesPaused: false,
    cancelReason: "",
    boxOffice: { enabled: false, opensAt: null },
    reminder: { enabled: false, hoursBefore: 24, directions: "", calendar: "", sentAt: null },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    publishedAt: null,
    ...overrides,
  }
}

export function dashStatsTicketTypeCreate(
  overrides: Partial<DashState["ticketTypes"][number]> & { id: string; eventId: string },
): DashState["ticketTypes"][number] {
  return {
    name: `Tickets ${overrides.id}`,
    description: "",
    channel: "online",
    hidden: false,
    capacity: 100,
    maxPerOrder: 8,
    taxRateBps: 700,
    sortOrder: 0,
    archivedAt: null,
    salesStartAt: null,
    salesEndAt: null,
    phases: [{ id: `ph-${overrides.id}`, name: "Regulär", priceCents: 2000, endsAt: null, quota: null }],
    ...overrides,
  }
}

let ticketCodeCounter = 0

export function dashStatsOrderCreate(overrides: Partial<DashOrder> & { id: string; eventId: string }): {
  order: DashOrder
  tickets: DashTicket[]
} {
  const ticketTypeId = overrides.lines?.[0]?.ticketTypeId ?? "tt-1"
  const quantity = overrides.lines?.reduce((sum, line) => sum + line.quantity, 0) ?? 1
  const tickets: DashTicket[] = Array.from({ length: quantity }, (_, index) => {
    ticketCodeCounter += 1
    const code = `T-${String(ticketCodeCounter).padStart(4, "0")}-${String(index).padStart(4, "0")}`
    return {
      id: `${overrides.id}-t-${index}`,
      orderId: overrides.id,
      eventId: overrides.eventId,
      ticketTypeId,
      code,
      holderName: "Lea Schneider",
      holderEmail: "lea.schneider@example.de",
      status: "gueltig",
      checkedInAt: null,
      entrance: null,
    }
  })
  const order: DashOrder = {
    number: "EV-260100",
    orgId: "org-lindenhof",
    channel: "online",
    createdAt: "2026-10-10T10:00:00.000Z",
    buyer: { firstName: "Lea", lastName: "Schneider", email: "lea.schneider@example.de" },
    status: "bezahlt",
    payment: { method: "karte", costCents: 0 },
    lines: [
      {
        ticketTypeId,
        phaseId: "ph-tt-1",
        name: "Ticket",
        unitPriceCents: 2000,
        quantity,
        taxRateBps: 700,
      },
    ],
    discount: null,
    voucher: null,
    serviceFeeCents: 0,
    totalCents: 2000 * quantity,
    refunds: [],
    chargeback: null,
    notes: [],
    emails: [],
    invoiceNumber: "",
    ...overrides,
    id: overrides.id,
    eventId: overrides.eventId,
  }
  return { order, tickets }
}

export function dashStatsOrderOptions(args: {
  id: string
  eventId: string
  createdAt: string
  status?: DashOrderStatus
  channel?: DashOrderChannel
  quantity?: number
  unitPriceCents?: number
  ticketTypeId?: string
  discountCents?: number
  refundCents?: number
  paymentCostCents?: number
  checkedInAt?: string | null
}): { order: DashOrder; tickets: DashTicket[] } {
  const quantity = args.quantity ?? 1
  const unitPriceCents = args.unitPriceCents ?? 2000
  const ticketTypeId = args.ticketTypeId ?? "tt-1"
  const { order, tickets } = dashStatsOrderCreate({
    id: args.id,
    eventId: args.eventId,
    createdAt: args.createdAt,
    status: args.status ?? "bezahlt",
    channel: args.channel ?? "online",
    lines: [
      {
        ticketTypeId,
        phaseId: `ph-${ticketTypeId}`,
        name: "Ticket",
        unitPriceCents,
        quantity,
        taxRateBps: 700,
      },
    ],
    discount:
      args.discountCents === undefined || args.discountCents === 0
        ? null
        : { codeId: "c-1", code: "RABATT", amountCents: args.discountCents },
    refunds:
      args.refundCents === undefined || args.refundCents === 0
        ? []
        : [
            {
              id: `${args.id}-r-1`,
              amountCents: args.refundCents,
              feeCents: 0,
              reason: "Teil",
              at: args.createdAt,
              ticketIds: [],
            },
          ],
    payment: { method: "karte", costCents: args.paymentCostCents ?? 0 },
    totalCents: quantity * unitPriceCents,
  })
  if (args.checkedInAt !== undefined) for (const ticket of tickets) ticket.checkedInAt = args.checkedInAt
  return { order, tickets }
}

export function dashStatsStateCreate(args: { orders: DashOrder[]; tickets: DashTicket[]; now: Date }): DashState {
  return {
    version: 1,
    seededAt: args.now.toISOString(),
    seedDay: "2026-10-18",
    session: { userId: "user-mara", activeOrgId: "org-lindenhof", simulatedRole: null },
    users: [],
    orgs: [dashStatsOrgCreate()],
    members: [],
    events: [
      dashStatsEventCreate({ id: "ev-1" }),
      dashStatsEventCreate({ id: "ev-2", slug: "event-ev-2", title: "Event ev-2" }),
    ],
    ticketTypes: [
      dashStatsTicketTypeCreate({ id: "tt-1", eventId: "ev-1" }),
      dashStatsTicketTypeCreate({ id: "tt-2", eventId: "ev-2" }),
    ],
    codes: [],
    vouchers: [],
    orders: args.orders,
    tickets: args.tickets,
    guestQuotas: [],
    guests: [],
    scans: [],
    scannerLinks: [],
    messages: [],
    templates: [],
    payouts: [],
    boxOfficeSales: [],
    audit: [],
  }
}
