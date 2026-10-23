import * as a from "valibot"
import { cantBeEmpty } from "#src/utils/valibot/cantBeEmpty.ts"
import { inputMaxLengthDefault } from "#src/utils/valibot/inputMaxLength.ts"

const regexMessage1 = "Nur lateinische Buchstaben, Ziffern und Bindestriche erlaubt."
const regexMessage2 = "Keine doppelten Bindestriche erlaubt."
const regexMessage3 = "Kein Bindestrich am Anfang erlaubt."
const regexMessage4 = "Kein Bindestrich am Ende erlaubt."

export const orgHandleSchema = a.pipe(
  a.string(),
  a.trim(),
  a.nonEmpty(cantBeEmpty),
  a.minLength(3, "Die Kurzadresse braucht mindestens 3 Zeichen."),
  a.regex(/^[a-zA-Z0-9-]+$/, regexMessage1),
  a.regex(/^(?!.*--)/, regexMessage2),
  a.regex(/^[^-]/, regexMessage3),
  a.regex(/[^-]$/, regexMessage4),
  a.maxLength(inputMaxLengthDefault, "Höchstens 100 Zeichen erlaubt."),
)

export type OrgHandle = a.InferOutput<typeof orgHandleSchema>

export function orgHandleGenerate(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}
