import * as v from "valibot"

export const dashOrderStatusSchema = v.picklist(["bezahlt", "offen", "storniert", "erstattet", "teilerstattet"])

export type DashOrderStatus = v.InferOutput<typeof dashOrderStatusSchema>
