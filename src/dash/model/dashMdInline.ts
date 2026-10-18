export type DashMdInline =
  | { type: "text"; text: string }
  | { type: "bold"; children: DashMdInline[] }
  | { type: "italic"; children: DashMdInline[] }
  | { type: "link"; href: string; children: DashMdInline[] }
  | { type: "break" }
