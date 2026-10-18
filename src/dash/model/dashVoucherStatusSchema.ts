import * as v from "valibot"

export const dashVoucherStatusSchema = v.picklist(["aktiv", "eingeloest", "abgelaufen", "deaktiviert"])

export type DashVoucherStatus = v.InferOutput<typeof dashVoucherStatusSchema>
