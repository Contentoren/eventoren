import * as v from "valibot"

export const dashScanResultSchema = v.picklist(["ok", "doppelt", "falsches-event", "unbekannt", "storniert"])

export type DashScanResult = v.InferOutput<typeof dashScanResultSchema>
