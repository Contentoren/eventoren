export function adminEventDetailSearchParse(input: Record<string, unknown>): { tab?: "products" } {
  return input.tab === "products" ? { tab: "products" } : {}
}
