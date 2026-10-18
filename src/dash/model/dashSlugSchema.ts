import * as v from "valibot"

export const dashSlugSchema = v.pipe(v.string(), v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))

export type DashSlug = v.InferOutput<typeof dashSlugSchema>
