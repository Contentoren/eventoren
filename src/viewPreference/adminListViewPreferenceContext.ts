import { createContext } from "solid-js"
import type { AdminListView } from "./adminListViewSchema.ts"

export type AdminListViewPreference = {
  view: () => AdminListView
  selectView: (view: AdminListView) => void
}

export const adminListViewPreferenceContext = createContext<AdminListViewPreference>()
