import { languageSignal } from "#src/app/i18n/languageSignal.ts"
import type { TranslationBlock } from "#src/app/i18n/TranslationBlock.ts"

/**
 * Translation function for UI library, requires translation of all available languages in a TranslationBlock
 * @param b TranslationBlock
 * @returns string
 */
export function ttl(b: TranslationBlock): string {
  return b[languageSignal.get()]
}

export function ttl1(b: TranslationBlock, x: string | number): string {
  return (
    b[languageSignal.get()]
      //
      .replace("[X]", x.toString())
  )
}

export function ttl2(b: TranslationBlock, x1: string | number, x2: string | number): string {
  return (
    b[languageSignal.get()]
      //
      .replace("[X1]", x1.toString())
      .replace("[X2]", x2.toString())
  )
}

export function ttl3(b: TranslationBlock, x1: string | number, x2: string | number, x3: string | number): string {
  return b[languageSignal.get()]
    .replace("[X1]", x1.toString())
    .replace("[X2]", x2.toString())
    .replace("[X3]", x3.toString())
}
