import * as v from "valibot"

export const dashVoucherValiditySchema = v.picklist(["1-jahr", "2-jahre", "3-jahre-jahresende", "unbegrenzt", "datum"])

export type DashVoucherValidity = v.InferOutput<typeof dashVoucherValiditySchema>
