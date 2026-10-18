import * as v from "valibot"

import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashChargebackSchema } from "./dashChargebackSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"
import { dashNoteSchema } from "./dashNoteSchema.ts"
import { dashOrderBuyerSchema } from "./dashOrderBuyerSchema.ts"
import { dashOrderChannelSchema } from "./dashOrderChannelSchema.ts"
import { dashOrderDiscountSchema } from "./dashOrderDiscountSchema.ts"
import { dashOrderEmailSchema } from "./dashOrderEmailSchema.ts"
import { dashOrderLineSchema } from "./dashOrderLineSchema.ts"
import { dashOrderStatusSchema } from "./dashOrderStatusSchema.ts"
import { dashOrderVoucherUseSchema } from "./dashOrderVoucherUseSchema.ts"
import { dashPaymentMethodSchema } from "./dashPaymentMethodSchema.ts"
import { dashRefundSchema } from "./dashRefundSchema.ts"

export const dashOrderSchema = v.object({
  id: dashIdSchema,
  number: v.pipe(v.string(), v.regex(/^EV-\d+$/)),
  orgId: dashIdSchema,
  eventId: dashIdSchema,
  channel: dashOrderChannelSchema,
  createdAt: dashIsoSchema,
  buyer: dashOrderBuyerSchema,
  status: dashOrderStatusSchema,
  payment: v.object({
    method: dashPaymentMethodSchema,
    costCents: dashCentsSchema,
  }),
  lines: v.array(dashOrderLineSchema),
  discount: v.nullable(dashOrderDiscountSchema),
  voucher: v.nullable(dashOrderVoucherUseSchema),
  serviceFeeCents: dashCentsSchema,
  totalCents: dashCentsSchema,
  refunds: v.array(dashRefundSchema),
  chargeback: v.nullable(dashChargebackSchema),
  notes: v.array(dashNoteSchema),
  emails: v.array(dashOrderEmailSchema),
  invoiceNumber: v.string(),
})

export type DashOrder = v.InferOutput<typeof dashOrderSchema>
