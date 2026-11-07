import type { ContentEntry } from "@adaptive-ds/website-content-pipeline"
import type { ContentCollection } from "./contentCollectionSchema.ts"
import { allContent } from "./contentList.ts"
import { allContent as guidesAllContent } from "./guidesContentList.ts"

/** All entries (published or not) of a collection from the generated content lists. */
export function contentEntryList(collection: ContentCollection): readonly ContentEntry[] {
  return collection === "ratgeber" ? allContent : guidesAllContent
}
