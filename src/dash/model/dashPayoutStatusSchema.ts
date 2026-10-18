import * as v from "valibot"

export const dashPayoutStatusSchema = v.picklist(["geplant", "bereit", "ausgezahlt"])

export type DashPayoutStatus = v.InferOutput<typeof dashPayoutStatusSchema>
