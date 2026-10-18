import * as v from "valibot"

import { dashBankSchema } from "./dashBankSchema.ts"
import { dashFeeSchema } from "./dashFeeSchema.ts"
import { dashIdSchema } from "./dashIdSchema.ts"
import { dashImprintSchema } from "./dashImprintSchema.ts"
import { dashIsoSchema } from "./dashIsoSchema.ts"
import { dashOrgKindSchema } from "./dashOrgKindSchema.ts"
import { dashOrgStatusSchema } from "./dashOrgStatusSchema.ts"
import { dashOrgVoucherValiditySchema } from "./dashOrgVoucherValiditySchema.ts"
import { dashSlugSchema } from "./dashSlugSchema.ts"
import { dashSocialsSchema } from "./dashSocialsSchema.ts"
import { dashTaxSchema } from "./dashTaxSchema.ts"

export const dashOrgSchema = v.object({
  id: dashIdSchema,
  slug: dashSlugSchema,
  name: v.string(),
  kind: dashOrgKindSchema,
  subtitle: v.string(),
  description: v.string(),
  logoDataUrl: v.nullable(v.string()),
  website: v.string(),
  email: v.string(),
  phone: v.string(),
  socials: dashSocialsSchema,
  imprint: dashImprintSchema,
  bank: dashBankSchema,
  tax: dashTaxSchema,
  fee: dashFeeSchema,
  status: dashOrgStatusSchema,
  statusReason: v.string(),
  termsAcceptedAt: v.nullable(dashIsoSchema),
  dpaAcceptedAt: v.nullable(dashIsoSchema),
  createdAt: dashIsoSchema,
  voucherDefaultValidity: dashOrgVoucherValiditySchema,
})

export type DashOrg = v.InferOutput<typeof dashOrgSchema>
