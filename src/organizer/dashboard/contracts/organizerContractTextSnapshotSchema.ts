import * as v from "valibot"

export const organizerContractTextSnapshotSchema = v.array(v.strictObject({ heading: v.string(), body: v.string() }))

export type OrganizerContractTextSnapshot = v.InferOutput<typeof organizerContractTextSnapshotSchema>
