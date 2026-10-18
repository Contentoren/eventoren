import * as v from "valibot"

export const dashOrgKindSchema = v.picklist(["verein", "unternehmen", "schule", "privat"])

export type DashOrgKind = v.InferOutput<typeof dashOrgKindSchema>
