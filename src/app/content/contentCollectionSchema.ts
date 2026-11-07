import * as a from "valibot"

export const contentCollectionSchema = a.picklist(["ratgeber", "guides"])

export type ContentCollection = a.InferOutput<typeof contentCollectionSchema>
