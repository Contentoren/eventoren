import type { DashMdInline } from "./dashMdInline.ts"

export type DashMdBlock =
  | { type: "paragraph"; inlines: DashMdInline[] }
  | { type: "heading"; level: 2 | 3; inlines: DashMdInline[] }
  | { type: "list"; ordered: boolean; items: DashMdInline[][] }
