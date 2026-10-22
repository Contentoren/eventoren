import * as a from "valibot"
import { cantBeEmpty } from "#src/utils/valibot/cantBeEmpty.ts"
import { inputMaxLength100 } from "#src/utils/valibot/inputMaxLength.ts"

export const stringSchema1to100 = a.pipe(
  a.string(),
  a.trim(),
  a.nonEmpty(cantBeEmpty),
  a.maxLength(inputMaxLength100, "Höchstens 100 Zeichen erlaubt."),
)
