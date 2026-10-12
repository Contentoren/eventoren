export type AdminEventDetailTab = "details" | "products" | "codes"

export function adminEventDetailSearchParse(input: Record<string, unknown>): { tab?: "products" | "codes" } {
  if (input.tab === "products" || input.tab === "codes") return { tab: input.tab }
  return {}
}
