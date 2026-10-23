import * as a from "valibot"
import { cantBeEmpty } from "#src/utils/valibot/cantBeEmpty.ts"
import { inputMaxLength100 } from "#src/utils/valibot/inputMaxLength.ts"

export const emailSchema = a.pipe(
  a.string(),
  a.nonEmpty(cantBeEmpty),
  a.maxLength(inputMaxLength100, "Höchstens 100 Zeichen erlaubt."),
  a.email("Bitte gib eine gültige E-Mail-Adresse ein."),
)

export type Email = a.InferOutput<typeof emailSchema>

export const emailSchemaOptional = a.union([
  a.pipe(a.string(), a.length(0)),
  a.pipe(
    a.string(),
    a.maxLength(inputMaxLength100, "Höchstens 100 Zeichen erlaubt."),
    a.email("Bitte gib eine gültige E-Mail-Adresse ein."),
  ),
])
