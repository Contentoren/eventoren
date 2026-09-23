import * as v from "valibot"

export const adminListViewSchema = v.picklist(["list", "tiles"])
export type AdminListView = v.InferOutput<typeof adminListViewSchema>
