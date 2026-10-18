import * as v from "valibot"

import { dashCentsSchema } from "./dashCentsSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"
import { dashVoucherKindSchema } from "./dashVoucherKindSchema.ts"
import { dashVoucherRedemptionSchema } from "./dashVoucherRedemptionSchema.ts"
import { dashVoucherStatusSchema } from "./dashVoucherStatusSchema.ts"
import { dashVoucherValiditySchema } from "./dashVoucherValiditySchema.ts"

export const dashVoucherSchema = v.object({
  id: dashIdSchema,
  orgId: dashIdSchema,
  code: v.pipe(v.string(), v.regex(/^[A-Z0-9-]+$/)),
  initialCents: dashCentsSchema,
  balanceCents: dashCentsSchema,
  kind: dashVoucherKindSchema,
  recipientName: v.string(),
  recipientEmail: v.string(),
  message: v.string(),
  validity: dashVoucherValiditySchema,
  expiresAt: v.nullable(dashIsoSchema),
  status: dashVoucherStatusSchema,
  createdAt: dashIsoSchema,
  redemptions: v.array(dashVoucherRedemptionSchema),
})

export type DashVoucher = v.InferOutput<typeof dashVoucherSchema>
