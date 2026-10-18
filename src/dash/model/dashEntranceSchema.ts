import * as v from "valibot"

export const dashEntranceSchema = v.picklist(["Haupteingang", "Seiteneingang", "Abendkasse"])

export type DashEntrance = v.InferOutput<typeof dashEntranceSchema>
