import * as a from "valibot"
import { cantBeEmpty } from "#src/utils/valibot/cantBeEmpty.ts"
import { inputMaxLengthDefault } from "#src/utils/valibot/inputMaxLength.ts"

const regexMessage1 = "Nur lateinische Kleinbuchstaben, Ziffern und Bindestriche erlaubt."
const regexMessage2 = "Keine doppelten Bindestriche erlaubt."
const regexMessage3 = "Kein Bindestrich am Anfang erlaubt."
const regexMessage4 = "Kein Bindestrich am Ende erlaubt."

export const handleSchema = a.pipe(
  a.string(),
  a.trim(),
  a.nonEmpty(cantBeEmpty),
  a.minLength(3, "Mindestens 3 Zeichen erforderlich."),
  a.regex(/^[a-z0-9-]+$/, regexMessage1),
  a.regex(/^(?!.*--)/, regexMessage2),
  a.regex(/^[^-]/, regexMessage3),
  a.regex(/[^-]$/, regexMessage4),
  a.maxLength(inputMaxLengthDefault, "Höchstens 100 Zeichen erlaubt."),
)

export function handleGenerate(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}
