import * as v from "valibot"

/** Customer profile edit: display name only; e-mail is identity and read-only. */
export const customerAccountProfileUpdateSchema = v.strictObject({
  name: v.pipe(v.string(), v.trim(), v.minLength(1, "Name angeben"), v.maxLength(120, "Name ist zu lang")),
})

export type CustomerAccountProfileUpdate = v.InferOutput<typeof customerAccountProfileUpdateSchema>
