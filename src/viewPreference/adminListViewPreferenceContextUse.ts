import { useContext } from "solid-js"
import { adminListViewPreferenceContext } from "./adminListViewPreferenceContext.ts"

export function adminListViewPreferenceContextUse() {
  return useContext(adminListViewPreferenceContext)
}
