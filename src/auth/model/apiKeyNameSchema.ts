import * as a from "valibot"

export const apiKeyNameSchema = a.pipe(a.string(), a.trim(), a.minLength(1), a.maxLength(80))
