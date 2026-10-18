import * as v from "valibot"

export const dashDiscountTypeSchema = v.picklist(["prozent", "betrag"])

export type DashDiscountType = v.InferOutput<typeof dashDiscountTypeSchema>
