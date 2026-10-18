import * as v from "valibot"

export const dashOrgStatusSchema = v.picklist(["pruefung", "aktiv", "gesperrt"])

export type DashOrgStatus = v.InferOutput<typeof dashOrgStatusSchema>
