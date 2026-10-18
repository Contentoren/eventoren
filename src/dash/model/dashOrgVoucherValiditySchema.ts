import * as v from "valibot"

export const dashOrgVoucherValiditySchema = v.picklist(["1-jahr", "2-jahre", "3-jahre-jahresende", "unbegrenzt"])

export type DashOrgVoucherValidity = v.InferOutput<typeof dashOrgVoucherValiditySchema>
