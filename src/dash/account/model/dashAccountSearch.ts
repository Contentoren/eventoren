import * as v from "valibot"
import type { DashAccountTab } from "./dashAccountTab.ts"

export type DashAccountSearch = {
  tab?: DashAccountTab
  ticket?: string
  bestellung?: string
}

export const dashAccountSearchType = "search" as const
