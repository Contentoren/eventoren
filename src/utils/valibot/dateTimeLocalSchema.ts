import * as a from "valibot"
import { cantBeEmpty } from "#src/utils/valibot/cantBeEmpty.ts"

export const dateTimeLocalSchema = a.pipe(a.string(), a.nonEmpty(cantBeEmpty), a.isoDateTime())
