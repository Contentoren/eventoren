import * as a from "valibot"
import { inputMaxLength500 } from "#src/utils/valibot/inputMaxLength.ts"

export const stringSchema0to500 = a.pipe(
  a.string(),
  a.trim(),
  a.maxLength(inputMaxLength500, "Only a max length of 500 is allowed"),
)
