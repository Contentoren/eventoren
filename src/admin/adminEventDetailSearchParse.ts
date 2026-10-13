import * as v from "valibot"

const tabSchema = v.picklist(["details", "products", "codes", "release"])

export type AdminEventDetailTab = v.InferOutput<typeof tabSchema>

export function adminEventDetailSearchParse(input: Record<string, unknown>): {
  tab?: Exclude<AdminEventDetailTab, "details">
} {
  const result = v.safeParse(tabSchema, input.tab)
  if (result.success && result.output !== "details") return { tab: result.output }
  return {}
}
