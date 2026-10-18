import * as v from "valibot"

export const dashBoxOfficeSaleStatusSchema = v.picklist(["wartet", "bezahlt", "abgebrochen"])

export type DashBoxOfficeSaleStatus = v.InferOutput<typeof dashBoxOfficeSaleStatusSchema>
