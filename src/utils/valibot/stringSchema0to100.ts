import * as a from "valibot"
import { inputMaxLength100 } from "#src/utils/valibot/inputMaxLength.ts"

export const stringSchema0to100 = a.pipe(
  a.string(),
  a.trim(),
  a.maxLength(inputMaxLength100, "Höchstens 100 Zeichen erlaubt."),
)
