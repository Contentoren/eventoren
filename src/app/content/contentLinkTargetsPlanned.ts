import { contentPathCreate } from "./contentPathCreate.ts"
import { contentPlanList } from "./contentPlanList.ts"

/** Article paths of every planned article in both collections. */
export function contentLinkTargetsPlanned(): ReadonlySet<string> {
  return new Set(contentPlanList.map((item) => contentPathCreate(item.collection, item.slug)))
}
