import type { ContentListItem } from "./ContentListItem.ts"
import { contentCollectionList } from "./contentCollectionList.ts"
import { contentTodayRead } from "./contentTodayRead.ts"

/** Published article in the given language that shares `translationKey` (for hreflang / language switch). */
export function contentTranslationFind(
  translationKey: string,
  lang: "de" | "en",
  today: string = contentTodayRead(),
): ContentListItem | undefined {
  return contentCollectionList(lang === "de" ? "ratgeber" : "guides", today).find(
    (item) => item.meta.translationKey === translationKey,
  )
}
