import * as v from "valibot"

export const dashFeePayerSchema = v.picklist(["kaeufer", "veranstalter"])

export type DashFeePayer = v.InferOutput<typeof dashFeePayerSchema>
