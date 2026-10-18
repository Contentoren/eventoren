import * as v from "valibot"

export const dashVoucherKindSchema = v.picklist(["verkauft", "kostenlos"])

export type DashVoucherKind = v.InferOutput<typeof dashVoucherKindSchema>
