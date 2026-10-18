import * as v from "valibot"

export const dashMemberStatusSchema = v.picklist(["aktiv", "eingeladen"])

export type DashMemberStatus = v.InferOutput<typeof dashMemberStatusSchema>
