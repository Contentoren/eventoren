import { type Language, languageDefault } from "#src/app/i18n/language.ts"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.ts"

export const languageSignal: SignalObject<Language> = createSignalObject<Language>(languageDefault)
