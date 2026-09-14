import * as a from "valibot"
import { cantBeEmpty } from "#src/utils/valibot/cantBeEmpty.ts"
import { inputMaxLength100 } from "#src/utils/valibot/inputMaxLength.ts"

export const emailSchema = a.pipe(
  a.string(),
  a.nonEmpty(cantBeEmpty),
  a.maxLength(inputMaxLength100, "Only a max length of 100 is allowed"),
  a.email("The email is badly formatted"),
)

export const emailSchemaOptional = a.union([
  a.pipe(a.string(), a.length(0)),
  a.pipe(
    a.string(),
    a.maxLength(inputMaxLength100, "Only a max length of 100 is allowed"),
    a.email("The email is badly formatted"),
  ),
])
