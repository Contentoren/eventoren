import { describe, expect, it } from "bun:test"
import * as v from "valibot"

import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"
import { dashRoleSchema } from "./dashRoleSchema.ts"
import { dashSlugSchema } from "./dashSlugSchema.ts"
import { dashStateSchema } from "./dashStateSchema.ts"
import type { DashEvent } from "./dashEventSchema.ts"
import type { DashOrder } from "./dashOrderSchema.ts"
import type { DashOrg } from "./dashOrgSchema.ts"
import type { DashTicketType } from "./dashTicketTypeSchema.ts"
import { dashSeedCreate } from "../store/seed/dashSeedCreate.ts"

const seededAt = "2026-10-18T10:00:00.000Z"

const sampleOrg: DashOrg = {
  id: "org-lindenhof",
  slug: "kulturhaus-lindenhof",
  name: "Kulturhaus Lindenhof e.V.",
  kind: "verein",
  subtitle: "Kultur im Hof",
  description: "Konzerte und Lesungen im Innenhof.",
  logoDataUrl: null,
  website: "https://kulturhaus-lindenhof.example.de",
  email: "info@kulturhaus-lindenhof.de",
  phone: "030 123456",
  socials: { instagram: "", facebook: "", tiktok: "", youtube: "", x: "", linkedin: "" },
  imprint: {
    legalName: "Kulturhaus Lindenhof e.V.",
    street: "Lindenweg 1",
    zip: "10115",
    city: "Berlin",
    representative: "Mara Lindner",
    register: "VR 12345",
    vatId: "",
  },
  bank: { holder: "Kulturhaus Lindenhof e.V.", iban: "DE89370400440532013000" },
  tax: { status: "regel", defaultRateBps: 700 },
  fee: { percentBps: 500, fixedCents: 49, payer: "kaeufer" },
  status: "aktiv",
  statusReason: "",
  termsAcceptedAt: seededAt,
  dpaAcceptedAt: seededAt,
  createdAt: seededAt,
  voucherDefaultValidity: "3-jahre-jahresende",
}

const sampleEvent: DashEvent = {
  id: "ev-sommernacht",
  orgId: "org-lindenhof",
  slug: "sommernachtskonzert",
  title: "Sommernachtskonzert im Hof",
  subtitle: "Open Air",
  category: "konzert",
  startsAt: "2026-08-06T17:30:00.000Z",
  endsAt: "2026-08-06T21:30:00.000Z",
  doorsAt: "2026-08-06T16:30:00.000Z",
  venue: { name: "Lindenhof", street: "Lindenweg 1", zip: "10115", city: "Berlin" },
  imageUrl: "",
  imageAlt: "Bühne im Lindenhof bei Sonnenuntergang",
  description: "Ein Abend unter freiem Himmel.",
  faq: [{ id: "faq-1", question: "Gibt es Einlass?", answer: "Ab 18:30 Uhr." }],
  schedule: [{ id: "sch-1", time: "19:30", title: "Beginn", detail: "" }],
  status: "veroeffentlicht",
  visibility: "oeffentlich",
  salesPaused: false,
  cancelReason: "",
  boxOffice: { enabled: false, opensAt: null },
  reminder: {
    enabled: true,
    hoursBefore: 24,
    directions: "U8 Rosenthaler Platz",
    calendar: "Sommernachtskonzert",
    sentAt: null,
  },
  createdAt: seededAt,
  updatedAt: seededAt,
  publishedAt: seededAt,
}

const sampleTicketType: DashTicketType = {
  id: "tt-stehplatz",
  eventId: "ev-sommernacht",
  name: "Stehplatz",
  description: "Freie Platzwahl im Hof.",
  channel: "online",
  hidden: false,
  capacity: 480,
  maxPerOrder: 8,
  taxRateBps: 700,
  sortOrder: 0,
  archivedAt: null,
  salesStartAt: null,
  salesEndAt: null,
  phases: [{ id: "ph-1", name: "Regulär", priceCents: 2450, endsAt: null, quota: null }],
}

const sampleOrder: DashOrder = {
  id: "order-1",
  number: "EV-260123",
  orgId: "org-lindenhof",
  eventId: "ev-sommernacht",
  channel: "online",
  createdAt: seededAt,
  buyer: { firstName: "Lea", lastName: "Schneider", email: "lea.schneider@example.de" },
  status: "bezahlt",
  payment: { method: "karte", costCents: 120 },
  lines: [
    {
      ticketTypeId: "tt-stehplatz",
      phaseId: "ph-1",
      name: "Stehplatz",
      unitPriceCents: 2450,
      quantity: 2,
      taxRateBps: 700,
    },
  ],
  discount: null,
  voucher: null,
  serviceFeeCents: 294,
  totalCents: 5194,
  refunds: [],
  chargeback: null,
  notes: [],
  emails: [{ at: seededAt, to: "lea.schneider@example.de", kind: "tickets" }],
  invoiceNumber: "RE-260123",
}

describe("dashStateSchema", () => {
  it("accepts the minimal seed state", () => {
    const state = dashSeedCreate(new Date("2026-10-18T10:00:00.000Z"))
    const parsed = v.safeParse(dashStateSchema, state)
    expect(parsed.success).toBe(true)
  })

  it("derives seedDay as the Berlin calendar date of now", () => {
    const state = dashSeedCreate(new Date("2026-10-18T22:30:00.000Z"))
    expect(state.seedDay).toBe("2026-10-19")
    expect(v.safeParse(dashStateSchema, state).success).toBe(true)
  })

  it("rejects an unknown role", () => {
    expect(v.safeParse(dashRoleSchema, "superadmin").success).toBe(false)
  })

  it("rejects negative cents", () => {
    expect(v.safeParse(dashCentsSchema, -1).success).toBe(false)
  })

  it("rejects an invalid slug", () => {
    for (const value of ["Sommernacht", "sommernacht_konzert", "-sommernacht", "sommernacht-", ""])
      expect(v.safeParse(dashSlugSchema, value).success).toBe(false)
  })

  it("rejects an invalid iso timestamp", () => {
    for (const value of ["", "2026-10-18", "2026-10-18 10:00:00", "not-a-date"])
      expect(v.safeParse(dashIsoSchema, value).success).toBe(false)
  })

  it("accepts a full sample org, event, ticket type and order", () => {
    const state = dashSeedCreate(new Date(seededAt))
    const full = {
      ...state,
      orgs: [sampleOrg],
      events: [sampleEvent],
      ticketTypes: [sampleTicketType],
      orders: [sampleOrder],
    }
    expect(v.safeParse(dashStateSchema, full).success).toBe(true)
  })
})
