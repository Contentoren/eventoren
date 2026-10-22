import * as a from "valibot"

export const stringSchema0to5000 = a.pipe(a.string(), a.trim(), a.maxLength(5_000, "Höchstens 5000 Zeichen erlaubt."))
