import * as v from "valibot"

import { dashAuditEntrySchema } from "./dashAuditEntrySchema.ts"
import { dashBoxOfficeSaleSchema } from "./dashBoxOfficeSaleSchema.ts"
import { dashCodeSchema } from "./dashCodeSchema.ts"
import { dashDateOnlySchema } from "./dashDateOnlySchema.ts"
import { dashEventSchema } from "./dashEventSchema.ts"
import { dashGuestQuotaSchema } from "./dashGuestQuotaSchema.ts"
import { dashGuestSchema } from "./dashGuestSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"
import { dashMemberSchema } from "./dashMemberSchema.ts"
import { dashMessageSchema } from "./dashMessageSchema.ts"
import { dashOrderSchema } from "./dashOrderSchema.ts"
import { dashOrgSchema } from "./dashOrgSchema.ts"
import { dashPayoutSchema } from "./dashPayoutSchema.ts"
import { dashScannerLinkSchema } from "./dashScannerLinkSchema.ts"
import { dashScanSchema } from "./dashScanSchema.ts"
import { dashSessionSchema } from "./dashSessionSchema.ts"
import { dashTemplateSchema } from "./dashTemplateSchema.ts"
import { dashTicketSchema } from "./dashTicketSchema.ts"
import { dashTicketTypeSchema } from "./dashTicketTypeSchema.ts"
import { dashUserSchema } from "./dashUserSchema.ts"
import { dashVoucherSchema } from "./dashVoucherSchema.ts"

export const dashStateSchema = v.object({
  version: v.literal(1),
  seededAt: dashIsoSchema,
  seedDay: dashDateOnlySchema,
  session: dashSessionSchema,
  users: v.array(dashUserSchema),
  orgs: v.array(dashOrgSchema),
  members: v.array(dashMemberSchema),
  events: v.array(dashEventSchema),
  ticketTypes: v.array(dashTicketTypeSchema),
  codes: v.array(dashCodeSchema),
  vouchers: v.array(dashVoucherSchema),
  orders: v.array(dashOrderSchema),
  tickets: v.array(dashTicketSchema),
  guestQuotas: v.array(dashGuestQuotaSchema),
  guests: v.array(dashGuestSchema),
  scans: v.array(dashScanSchema),
  scannerLinks: v.array(dashScannerLinkSchema),
  messages: v.array(dashMessageSchema),
  templates: v.array(dashTemplateSchema),
  payouts: v.array(dashPayoutSchema),
  boxOfficeSales: v.array(dashBoxOfficeSaleSchema),
  audit: v.array(dashAuditEntrySchema),
})

export type DashState = v.InferOutput<typeof dashStateSchema>
