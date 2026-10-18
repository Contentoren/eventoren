import * as v from "valibot"

export const dashRoleSchema = v.picklist(["inhaber", "admin", "eventmanager", "finanzen", "einlass"])

export type DashRole = v.InferOutput<typeof dashRoleSchema>
